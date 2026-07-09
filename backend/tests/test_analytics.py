import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal, PredictionLog, BatchJob, MessageLog, AssistantLog, DataStudioLog

client = TestClient(app)

def test_global_stats():
    # 1. Clear caches
    from backend.routers.analytics import _global_stats_cache
    _global_stats_cache["data"] = None
    _global_stats_cache["timestamp"] = 0
    
    # 2. Seed some data
    db = SessionLocal()
    try:
        db.query(PredictionLog).delete()
        db.query(BatchJob).delete()
        db.query(MessageLog).delete()
        db.query(AssistantLog).delete()
        db.query(DataStudioLog).delete()
        
        db.add(PredictionLog(model_name="test", input_payload="{}", output_value="0"))
        db.add(PredictionLog(model_name="test", input_payload="{}", output_value="1"))
        
        db.add(BatchJob(id="test_job_1", row_count=10, model_name="test", status="completed"))
        
        db.add(MessageLog(channel="sms", recipient="123", message_body="test", status="sent"))
        db.add(MessageLog(channel="email", recipient="test@test.com", message_body="test", status="sent"))
        db.add(MessageLog(channel="whatsapp", recipient="123", message_body="test", status="sent"))
        
        db.add(AssistantLog(question="test", response="test", model_used="test"))
        
        db.add(DataStudioLog(filename="test1.csv"))
        db.add(DataStudioLog(filename="test2.csv"))
        db.commit()
    finally:
        db.close()
        
    # 3. Call endpoint
    res = client.get("/api/analytics/global-stats")
    assert res.status_code == 200
    data = res.json()
    
    assert data["total_predictions"] == 2
    assert data["total_batches"] == 1
    assert data["total_messages"] == 3
    assert data["total_assistant"] == 1
    assert data["total_datasets_processed"] == 2
    
    # 4. Check cache works (insert new item, should still return cached data)
    db = SessionLocal()
    try:
        db.add(PredictionLog(model_name="test2", input_payload="{}", output_value="2"))
        db.commit()
    finally:
        db.close()
        
    res_cached = client.get("/api/analytics/global-stats")
    assert res_cached.json()["total_predictions"] == 2  # Still 2 because of cache


def test_health_model_name_alignment():
    """
    Regression test: ensures the model names returned by /api/analytics/health
    exactly match the canonical names used by the Model Registry (machine_learning.py).

    If anyone changes the known_models list in analytics.py to a different naming
    convention (e.g. "salary_model" instead of "salary"), this test will catch it
    instead of silently showing wrong dashboard colors.
    """
    # The canonical keys registered by machine_learning.py in the TrainingRun table.
    # These are the ONLY correct values — verified against register_new_model_version calls.
    CANONICAL_REGISTRY_NAMES = {"salary", "laptop", "mini_llm"}

    # Seed real active model versions so the health endpoint can actually find them.
    from backend.routers.machine_learning import (
        train_salary_model_fallback,
        train_laptop_model_fallback,
        register_new_model_version,
    )
    db = SessionLocal()
    try:
        m_salary = train_salary_model_fallback()
        register_new_model_version(
            db=db, model_name="salary", model_instance=m_salary,
            epochs=1, elapsed_seconds=0.1, final_loss=0.0, final_score=0.99,
            metric_name="R2", user_id=None, architecture="GradientBoostingRegressor",
        )
        m_laptop = train_laptop_model_fallback()
        register_new_model_version(
            db=db, model_name="laptop", model_instance=m_laptop,
            epochs=1, elapsed_seconds=0.1, final_loss=0.0, final_score=0.98,
            metric_name="R2", user_id=None, architecture="GradientBoostingRegressor",
        )
    finally:
        db.close()

    res = client.get("/api/analytics/health")
    assert res.status_code == 200
    data = res.json()

    # Overall DB health must be connected
    assert data["db_status"] == "connected"

    # Every name in the health response must be a canonical registry name.
    # This catches any drift like "salary_model" vs "salary".
    returned_names = {m["name"] for m in data["models"]}
    assert returned_names == CANONICAL_REGISTRY_NAMES, (
        f"Health endpoint model names {returned_names!r} do not match "
        f"the canonical Model Registry names {CANONICAL_REGISTRY_NAMES!r}. "
        f"Fix the known_models list in backend/routers/analytics.py."
    )

    # Both salary and laptop must now resolve to at least yellow (file registered)
    # and mini_llm should be green if its file exists on disk.
    status_by_name = {m["name"]: m["status"] for m in data["models"]}
    for name in ("salary", "laptop"):
        assert status_by_name[name] in ("green", "yellow"), (
            f"Model '{name}' shows '{status_by_name[name]}' — expected green or yellow "
            f"after seeding a valid version. Check that register_new_model_version "
            f"is writing the file_path correctly."
        )

