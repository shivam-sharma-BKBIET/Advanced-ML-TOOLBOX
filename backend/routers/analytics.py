from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from datetime import datetime, timedelta
import time
import os
import logging

from backend.database import get_db, User, TrainingRun, PredictionLog, MessageLog, BatchJob, AssistantLog, DataStudioLog, SessionLocal
from backend.schemas.analytics import HealthResponse, ModelHealth, AnalyticsSummary, TrendData, ModelTrend, MessageStats
from backend.config import settings
from backend.limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])
STARTUP_TIME = time.time()

@router.get("/health", response_model=HealthResponse)
def get_system_health(db: Session = Depends(get_db)):
    # Calculate uptime
    uptime = time.time() - STARTUP_TIME
    
    # Check DB
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = "disconnected"
        
    # Check models
    models_status = []
    # Find active training runs grouped by model name
    active_runs = db.query(TrainingRun).filter(TrainingRun.is_active == True).all()
    
    known_models = ["salary", "laptop", "mini_llm"]
    active_by_name = {run.model_name: run for run in active_runs}
    
    for name in known_models:
        run = active_by_name.get(name)
        file_exists = False
        active_version = None
        last_trained = None
        status = "red"
        
        if run:
            active_version = run.version_num
            last_trained = run.timestamp.isoformat()
            if run.file_path and os.path.exists(run.file_path):
                file_exists = True
                status = "green"
            else:
                status = "yellow"
        
        models_status.append(ModelHealth(
            name=name,
            active_version=active_version,
            last_trained=last_trained,
            file_exists=file_exists,
            status=status
        ))
        
    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        uptime_seconds=uptime,
        db_status=db_status,
        models=models_status
    )

@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    db: Session = Depends(get_db)
):
    user_filter = []
    msg_filter = []
    run_filter = []
        
    # Predictions stats
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    preds_query = db.query(PredictionLog)
    if user_filter:
        preds_query = preds_query.filter(*user_filter)
        
    predictions_all_time = preds_query.count()
    predictions_today = preds_query.filter(PredictionLog.created_at >= today_start).count()
    predictions_week = preds_query.filter(PredictionLog.created_at >= week_start).count()
    
    # Most used model
    most_used = db.query(PredictionLog.model_name, func.count(PredictionLog.id).label("count"))\
        .filter(*user_filter)\
        .group_by(PredictionLog.model_name)\
        .order_by(desc("count"))\
        .first()
    most_used_model = most_used[0] if most_used else None
    
    # Avg latency (last 100)
    latencies = preds_query.filter(PredictionLog.latency_ms.isnot(None))\
        .order_by(desc(PredictionLog.created_at))\
        .limit(100)\
        .all()
    avg_latency = sum(l.latency_ms for l in latencies) / len(latencies) if latencies else None
    
    # Message stats
    msg_query = db.query(MessageLog.status, func.count(MessageLog.id))\
        .filter(*msg_filter)\
        .group_by(MessageLog.status)\
        .all()
    msg_counts = {status: count for status, count in msg_query}
    message_stats = MessageStats(
        sent=msg_counts.get("sent", 0),
        failed=msg_counts.get("failed", 0),
        pending=msg_counts.get("pending", 0) + msg_counts.get("simulated", 0)
    )
    
    # Model trends (last 20 runs per model)
    model_trends = []
    known_models = ["salary", "laptop", "mini_llm"]
    for model_name in known_models:
        runs = db.query(TrainingRun)\
            .filter(TrainingRun.model_name == model_name)\
            .filter(*run_filter)\
            .order_by(TrainingRun.timestamp)\
            .limit(20)\
            .all()
        trends = [TrendData(timestamp=r.timestamp.isoformat(), loss=r.final_loss, score=r.final_score) for r in runs]
        model_trends.append(ModelTrend(model_name=model_name, trends=trends))
        
    return AnalyticsSummary(
        predictions_today=predictions_today,
        predictions_week=predictions_week,
        predictions_all_time=predictions_all_time,
        most_used_model=most_used_model,
        avg_latency_ms=avg_latency,
        model_trends=model_trends,
        message_stats=message_stats
    )


# Cache for global stats (30 seconds TTL)
_global_stats_cache = {"timestamp": 0, "data": None}

@router.get("/global-stats")
@limiter.limit("60/minute")
def get_global_stats(request: Request):
    global _global_stats_cache
    current_time = time.time()
    
    if _global_stats_cache["data"] and (current_time - _global_stats_cache["timestamp"] < 30):
        return _global_stats_cache["data"]
        
    db = SessionLocal()
    try:
        total_predictions = db.query(PredictionLog).count()
        total_batches = db.query(BatchJob).count()
        total_messages = db.query(MessageLog).count()
        total_assistant = db.query(AssistantLog).count()
        
        # Check if table exists (in case migration hasn't run during tests)
        try:
            total_data_studio = db.query(DataStudioLog).count()
        except Exception:
            total_data_studio = 0
            db.rollback()
            
        data = {
            "total_predictions": total_predictions,
            "total_batches": total_batches,
            "total_messages": total_messages,
            "total_assistant": total_assistant,
            "total_datasets_processed": total_data_studio
        }
        
        _global_stats_cache = {
            "timestamp": current_time,
            "data": data
        }
        
        return data
    except Exception as e:
        logger.error(f"Failed to fetch global stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch global stats")
    finally:
        db.close()
