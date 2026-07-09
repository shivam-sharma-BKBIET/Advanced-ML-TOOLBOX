import pytest
import json
import datetime
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import Base, SessionLocal, User, TrainingRun, PredictionLog

client = TestClient(app)

@pytest.fixture()
def setup_mock_data():
    db = SessionLocal()
    
    # 1. Create User
    user = User(username="testdrift", email="drift@example.com", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # 2. Create Training Run with Baseline Stats
    baseline_stats = {
        "numeric": {
            "experience": {
                "mean": 5.0, "std": 2.0, "min": 0.0, "max": 10.0,
                "quantiles": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0]
            }
        },
        "categorical": {
            "education": {
                "Bachelors": 0.5,
                "Masters": 0.5
            }
        }
    }
    
    run = TrainingRun(
        model_name="mock_salary",
        epochs=1,
        elapsed_seconds=1.0,
        final_loss=0.1,
        final_score=0.9,
        metric_name="R2",
        user_id=user.id,
        version_num=1,
        is_active=True,
        baseline_stats=json.dumps(baseline_stats)
    )
    db.add(run)
    db.commit()
    
    yield user.id, run.version_num
    
    db.close()


def test_drift_cold_start(setup_mock_data):
    # Only 1 prediction log, should trigger "not enough data"
    user_id, version_num = setup_mock_data
    db = SessionLocal()
    
    db.add(PredictionLog(
        user_id=user_id,
        model_name="mock_salary",
        model_version=str(version_num),
        input_payload=json.dumps({"experience": 5, "education": "Bachelors"}),
        output_value="{}"
    ))
    db.commit()
    db.close()
    
    # Needs a logged-in user or just query since it doesn't enforce get_current_user in get_drift_report?
    # Wait, get_drift_report in drift.py doesn't require current_user, it's an internal / dashboard endpoint
    res = client.get("/api/ml/mock_salary/drift-report")
    assert res.status_code == 200
    assert res.json()["status"] == "not_enough_data"
    assert "will activate once 29 more" in res.json()["message"]


def test_drift_stable(setup_mock_data):
    user_id, version_num = setup_mock_data
    db = SessionLocal()
    
    # Add 30 more predictions that perfectly match the uniform baseline distribution
    for i in range(30):
        # 10 bins, we place 3 in each bin (0-9) to match quantiles
        exp = (i % 10) + 0.5 
        edu = "Bachelors" if i % 2 == 0 else "Masters"
        
        db.add(PredictionLog(
            user_id=user_id,
            model_name="mock_salary",
            model_version=str(version_num),
            input_payload=json.dumps({"experience": exp, "education": edu}),
            output_value="{}"
        ))
    db.commit()
    db.close()
    
    res = client.get("/api/ml/mock_salary/drift-report")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "active"
    assert data["overall_status"] == "stable"
    assert data["features"]["experience"]["status"] == "stable"


def test_drift_significant(setup_mock_data, monkeypatch):
    from backend.routers import drift
    # clear cache
    drift._drift_cache.clear()
    
    user_id, version_num = setup_mock_data
    db = SessionLocal()
    
    # Add 30 heavily skewed predictions
    for i in range(30):
        db.add(PredictionLog(
            user_id=user_id,
            model_name="mock_salary",
            model_version=str(version_num),
            input_payload=json.dumps({"experience": 20.0, "education": "PhD"}),
            output_value="{}"
        ))
    db.commit()
    db.close()
    
    res = client.get("/api/ml/mock_salary/drift-report")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "active"
    assert data["overall_status"] == "significant drift"
    assert data["features"]["experience"]["status"] == "significant drift"
    assert data["features"]["education"]["status"] == "significant drift"
