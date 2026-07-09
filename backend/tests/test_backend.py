import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.main import app
from backend.database import Base, SessionLocal, User
from backend.limiter import limiter

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_mock_models():
    # Disable rate limiting in tests to prevent cross-test interference
    limiter._storage.reset()
    
    # Train and register real model instances to support full prediction pipeline in tests
    from backend.routers.machine_learning import (
        train_salary_model_fallback,
        train_laptop_model_fallback,
        register_new_model_version
    )
    db = SessionLocal()
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





def test_input_sanitization_and_validation():
    # 1. Sentiment analysis XSS protection test (HTML tag stripping)
    # Pure HTML tags should strip down to empty text and trigger 422 error
    res = client.post("/api/ml/analyze-sentiment", json={"text": "<p><b></b></p>"})
    assert res.status_code == 422
    assert "cannot be empty after sanitization" in res.json()["detail"]

    # 2. Sentiment analysis execution on mixed content
    res = client.post("/api/ml/analyze-sentiment", json={"text": "<script>alert('xss')</script>This is absolutely brilliant!"})
    assert res.status_code == 200
    # Should evaluate "This is absolutely brilliant!" correctly
    assert res.json()["sentiment_label"] in ["Positive", "Highly Positive"]


def test_shap_salary_explanation_structure():
    """
    Verifies that predict-salary endpoint correctly returns a SHAP explanation structure
    when include_explanation=True, and that the explanation contributions are sorted
    descending by absolute contribution magnitude.
    """
    payload = {
        "payload": [
            {
                "experience": 5,
                "education": "Masters",
                "skill_score": 85,
                "company_size": "Medium"
            }
        ],
        "include_explanation": True
    }
    res = client.post("/api/ml/predict-salary", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "predictions" in data
    assert "explanation" in data
    
    explanation = data["explanation"]
    assert explanation is not None
    assert "base_value" in explanation
    assert "contributions" in explanation
    assert "error" in explanation
    assert explanation["error"] is None
    
    contributions = explanation["contributions"]
    assert len(contributions) == 4
    
    # Verify sorted by absolute magnitude descending
    magnitudes = [abs(c["contribution"]) for c in contributions]
    assert magnitudes == sorted(magnitudes, reverse=True), "Contributions are not sorted by absolute magnitude descending"
    
    # Verify each contribution contains required fields
    for contrib in contributions:
        assert "feature" in contrib
        assert "value" in contrib
        assert "contribution" in contrib
        assert "direction" in contrib
        assert contrib["direction"] in ("positive", "negative")


def test_shap_laptop_explanation_structure():
    """
    Verifies that predict-laptop endpoint correctly returns a SHAP explanation structure
    when include_explanation=True.
    """
    payload = {
        "ram": 16,
        "storage": 512,
        "weight": 1.5,
        "screen_size": 14.0,
        "processor_speed": 2.8,
        "include_explanation": True
    }
    res = client.post("/api/ml/predict-laptop", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "predicted_price" in data
    assert "explanation" in data
    
    explanation = data["explanation"]
    assert explanation is not None
    assert "base_value" in explanation
    assert "contributions" in explanation
    assert explanation["error"] is None
    
    contributions = explanation["contributions"]
    assert len(contributions) == 5
    
    # Verify sorted by absolute magnitude descending
    magnitudes = [abs(c["contribution"]) for c in contributions]
    assert magnitudes == sorted(magnitudes, reverse=True)


def test_shap_degradation_and_cache_rebuild():
    """
    Verifies that the SHAP cache logic functions, can rebuild/invalidate on activation,
    and that prediction degrades gracefully back to error-only explanations if SHAP fails.
    """
    # 1. Access caching dict inside backend.routers.machine_learning
    from backend.routers.machine_learning import _shap_cache, _invalidate_shap_cache
    
    _invalidate_shap_cache()
    assert len(_shap_cache) == 0
    
    # Trigger a prediction to build cache
    payload = {
        "ram": 8,
        "storage": 256,
        "weight": 2.0,
        "screen_size": 15.6,
        "processor_speed": 2.0,
        "include_explanation": True
    }
    res = client.post("/api/ml/predict-laptop", json=payload)
    assert res.status_code == 200
    assert len(_shap_cache) == 1
    
    # 2. Invalidate cache manually
    _invalidate_shap_cache("laptop")
    assert len(_shap_cache) == 0
    
    # 3. Graceful degradation: Test that if an exception is raised during explainer build or SHAP call,
    # the endpoint still returns the prediction with an error field in the explanation.
    # We mock _get_or_build_explainer to raise an exception
    import unittest.mock as mock
    with mock.patch("backend.routers.machine_learning._get_or_build_explainer", side_effect=ValueError("SHAP simulation error")):
        res_fail = client.post("/api/ml/predict-laptop", json=payload)
        assert res_fail.status_code == 200
        data_fail = res_fail.json()
        assert "predicted_price" in data_fail
        assert "explanation" in data_fail
        explanation_fail = data_fail["explanation"]
        assert explanation_fail["error"] is not None
        assert "Explanation unavailable" in explanation_fail["error"]
        assert len(explanation_fail["contributions"]) == 0


