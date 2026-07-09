import os
import pytest
import io
import pandas as pd
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import Base, engine, SessionLocal as TestingSessionLocal, get_db, User, BatchJob, PredictionLog

client = TestClient(app)

from backend.routers.machine_learning import (
    train_salary_model_fallback,
    train_laptop_model_fallback,
    register_new_model_version
)
from backend.database import TrainingRun

@pytest.fixture(autouse=True)
def setup_mock_data():
    db = TestingSessionLocal()
    # Train and register real model instances to support full prediction pipeline in tests
    m_salary = train_salary_model_fallback()
    register_new_model_version(
        db=db,
        model_name="salary",
        model_instance=m_salary,
        epochs=1,
        elapsed_seconds=0.1,
        final_loss=0.0,
        final_score=0.98,
        metric_name="Training R² Score",
        user_id=None,
        architecture="GradientBoostingRegressor"
    )
    
    m_laptop = train_laptop_model_fallback()
    register_new_model_version(
        db=db,
        model_name="laptop",
        model_instance=m_laptop,
        epochs=1,
        elapsed_seconds=0.1,
        final_loss=0.0,
        final_score=0.97,
        metric_name="Training R² Score",
        user_id=None,
        architecture="GradientBoostingRegressor"
    )
    db.close()
def test_batch_prediction_invalid_csv():
    headers = {}
    
    # Missing required column 'company_size'
    csv_content = b"experience,education,skill_score\n5,Bachelors,80\n"
    res = client.post("/api/ml/salary/predict-batch", files={"file": ("test.csv", csv_content, "text/csv")})
    assert res.status_code == 422
    assert "Missing required columns" in res.json()["detail"]
    
    # Invalid data types
    csv_content = b"experience,education,skill_score,company_size\nfive,Bachelors,80,Medium\n"
    res = client.post("/api/ml/salary/predict-batch", files={"file": ("test.csv", csv_content, "text/csv")})
    assert res.status_code == 422
    assert "Non-numeric values found" in res.json()["detail"]


def test_batch_prediction_sync():
    headers = {}
    
    csv_content = b"experience,education,skill_score,company_size\n5,Bachelors,80,Medium\n10,Masters,90,Large\n"
    res = client.post("/api/ml/salary/predict-batch", files={"file": ("test.csv", csv_content, "text/csv")})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert "job_id" in data
    assert len(data["predictions"]) == 2
    
    job_id = data["job_id"]
    
    # Fetch job status
    res_status = client.get(f"/api/ml/batch-jobs/{job_id}")
    assert res_status.status_code == 200
    assert res_status.json()["row_count"] == 2
    
    # Export csv
    res_export = client.get(f"/api/ml/batch-jobs/{job_id}/export")
    assert res_export.status_code == 200
    assert "attachment; filename=batch_" in res_export.headers["content-disposition"]
    
    content = res_export.content.decode("utf-8")
    assert "prediction" in content
    assert "has_explanation" in content


def test_batch_prediction_async():
    headers = {}
    
    # Create large CSV (505 rows)
    rows = ["experience,education,skill_score,company_size"]
    for i in range(505):
        rows.append(f"{i % 30},Bachelors,80,Medium")
    csv_content = "\n".join(rows).encode("utf-8")
    
    res = client.post("/api/ml/salary/predict-batch", files={"file": ("test.csv", csv_content, "text/csv")})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "processing"
    assert "job_id" in data
    assert data["row_count"] == 505



