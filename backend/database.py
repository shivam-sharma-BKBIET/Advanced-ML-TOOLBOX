import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from backend.config import settings
import os
import sys
from sqlalchemy.pool import StaticPool

IS_TEST = "pytest" in sys.modules or os.getenv("TESTING") == "1"
db_url = "sqlite:///:memory:" if IS_TEST else settings.DATABASE_URL

# Ensure the database directory exists if using sqlite
if db_url.startswith("sqlite") and not db_url.startswith("sqlite:///:memory:"):
    db_path = db_url.replace("sqlite:///", "")
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)

# Create engine with connect_args for SQLite single-thread checking override
engine = create_engine(
    db_url,
    connect_args={"check_same_thread": False} if db_url.startswith("sqlite") else {},
    poolclass=StaticPool if db_url == "sqlite:///:memory:" else None
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    preferences = Column(String, nullable=True, default='{"theme":"dark","refreshInterval":"15","notifications":true,"compactMode":false,"sidebarCollapsed":false,"language":"en"}')

    # Relationship to training history
    training_runs = relationship("TrainingRun", back_populates="user")
    prediction_logs = relationship("PredictionLog", back_populates="user")
    message_logs = relationship("MessageLog", back_populates="user")
    assistant_logs = relationship("AssistantLog", back_populates="user")

class TrainingRun(Base):
    __tablename__ = "training_runs"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, nullable=False)
    epochs = Column(Integer, nullable=False)
    elapsed_seconds = Column(Float, nullable=False)
    final_loss = Column(Float, nullable=False)
    final_score = Column(Float, nullable=False)
    metric_name = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    version_num = Column(Integer, nullable=True)
    file_path = Column(String, nullable=True)
    is_active = Column(Boolean, default=False)
    architecture = Column(String, nullable=True, default="LSTM")
    baseline_stats = Column(String, nullable=True)  # JSON string
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", back_populates="training_runs")

class BatchJob(Base):
    __tablename__ = "batch_jobs"
    
    id = Column(String, primary_key=True, index=True) # UUID string
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    model_name = Column(String, nullable=False)
    model_version = Column(String, nullable=True)
    row_count = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="processing") # processing, completed, failed
    error_detail = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", backref="batch_jobs")
    prediction_logs = relationship("PredictionLog", back_populates="batch_job")


class PredictionLog(Base):
    __tablename__ = "prediction_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    batch_job_id = Column(String, ForeignKey("batch_jobs.id"), nullable=True)
    model_name = Column(String, nullable=False)
    model_version = Column(String, nullable=True)
    input_payload = Column(String, nullable=False)  # Stored as JSON string
    output_value = Column(String, nullable=False)
    explanation = Column(String, nullable=True)     # Stored as JSON string (SHAP values)
    latency_ms = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="prediction_logs")
    batch_job = relationship("BatchJob", back_populates="prediction_logs")

class MessageLog(Base):
    __tablename__ = "message_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    channel = Column(String, nullable=False)        # 'whatsapp', 'sms', 'email'
    recipient = Column(String, nullable=False)
    message_body = Column(String, nullable=False)
    status = Column(String, nullable=False)         # 'sent', 'failed', 'pending', 'simulated'
    provider_response = Column(String, nullable=True) # Stored as JSON string
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="message_logs")

class AssistantLog(Base):
    __tablename__ = "assistant_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    question = Column(String, nullable=False)
    response = Column(String, nullable=True)
    model_used = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    is_success = Column(Boolean, default=True)
    
    user = relationship("User", back_populates="assistant_logs")


class DataStudioLog(Base):
    __tablename__ = "data_studio_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

class GlobalApiUsage(Base):
    __tablename__ = "global_api_usage"
    
    # date string 'YYYY-MM-DD'
    date = Column(String, primary_key=True, index=True)
    call_count = Column(Integer, default=0, nullable=False)

def init_db():
    Base.metadata.create_all(bind=engine)
    # Lightweight database self-migration logic for SQLite
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("training_runs")]
    
    with engine.begin() as conn:
        # User migrations
        user_columns = [c["name"] for c in inspector.get_columns("users")]
        if "is_admin" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
        if "preferences" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN preferences VARCHAR DEFAULT '{}'"))
            
        # PredictionLog migrations
        pred_columns = [c["name"] for c in inspector.get_columns("prediction_logs")]
        if "latency_ms" not in pred_columns:
            conn.execute(text("ALTER TABLE prediction_logs ADD COLUMN latency_ms FLOAT"))
        if "batch_job_id" not in pred_columns:
            conn.execute(text("ALTER TABLE prediction_logs ADD COLUMN batch_job_id VARCHAR"))
            
        # TrainingRun migrations
        if "version_num" not in columns:
            conn.execute(text("ALTER TABLE training_runs ADD COLUMN version_num INTEGER DEFAULT 1"))

        # DataStudioLog table creation check
        tables = inspector.get_table_names()
        if "data_studio_logs" not in tables:
            conn.execute(text("""
                CREATE TABLE data_studio_logs (
                    id INTEGER NOT NULL,
                    filename VARCHAR NOT NULL,
                    created_at DATETIME,
                    PRIMARY KEY (id)
                )
            """))
            conn.execute(text("CREATE INDEX ix_data_studio_logs_created_at ON data_studio_logs (created_at)"))
            conn.execute(text("CREATE INDEX ix_data_studio_logs_id ON data_studio_logs (id)"))
        if "file_path" not in columns:
            conn.execute(text("ALTER TABLE training_runs ADD COLUMN file_path VARCHAR"))
        if "is_active" not in columns:
            conn.execute(text("ALTER TABLE training_runs ADD COLUMN is_active BOOLEAN DEFAULT 0"))
        if "architecture" not in columns:
            conn.execute(text("ALTER TABLE training_runs ADD COLUMN architecture VARCHAR DEFAULT 'LSTM'"))
        if "baseline_stats" not in columns:
            conn.execute(text("ALTER TABLE training_runs ADD COLUMN baseline_stats VARCHAR"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
