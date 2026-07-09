from pydantic import BaseModel
from typing import List, Optional

class ModelHealth(BaseModel):
    name: str
    active_version: Optional[int]
    last_trained: Optional[str]
    file_exists: bool
    status: str # "green", "yellow", "red"

class HealthResponse(BaseModel):
    status: str
    uptime_seconds: float
    db_status: str
    models: List[ModelHealth]

class TrendData(BaseModel):
    timestamp: str
    loss: float
    score: float

class ModelTrend(BaseModel):
    model_name: str
    trends: List[TrendData]

class MessageStats(BaseModel):
    sent: int
    failed: int
    pending: int

class AnalyticsSummary(BaseModel):
    predictions_today: int
    predictions_week: int
    predictions_all_time: int
    most_used_model: Optional[str]
    avg_latency_ms: Optional[float]
    model_trends: List[ModelTrend]
    message_stats: MessageStats
