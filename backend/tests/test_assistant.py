import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from backend.main import app
from backend.database import Base, SessionLocal, User, AssistantLog, GlobalApiUsage
from backend.config import settings
import datetime

client = TestClient(app)

@patch("backend.routers.assistant.genai.GenerativeModel")
def test_assistant_chat_success(mock_model):
    # Mocking Gemini response
    mock_instance = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "Here is the explanation for your prediction."
    mock_instance.generate_content.return_value = mock_response
    mock_model.return_value = mock_instance

    headers = {}
    payload = {
        "message": "Explain this prediction",
        "context": {"feature": 1}
    }
    
    res = client.post("/api/assistant/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_success"] is True
    assert data["response"] == "Here is the explanation for your prediction."
    
    # Check DB logs
    with SessionLocal() as db:
        log = db.query(AssistantLog).first()
        assert log is not None
        assert log.question == "Explain this prediction"
        assert log.response == "Here is the explanation for your prediction."
        
        global_usage = db.query(GlobalApiUsage).first()
        assert global_usage is not None
        assert global_usage.call_count == 1


@patch("backend.routers.assistant.genai.GenerativeModel")
def test_assistant_chat_api_failure(mock_model):
    # Mocking Gemini API failure
    mock_instance = MagicMock()
    mock_instance.generate_content.side_effect = Exception("API quota exceeded")
    mock_model.return_value = mock_instance

    headers = {}
    payload = {"message": "Hello"}
    
    res = client.post("/api/assistant/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_success"] is False
    assert "trouble connecting" in data["response"]


@patch("backend.routers.assistant.genai.GenerativeModel")
def test_assistant_rate_limits(mock_model, monkeypatch):
    # Override settings for global rate limit to 2
    monkeypatch.setattr(settings, "GEMINI_DAILY_GLOBAL_CAP", 2)
    
    # Seed usage database with 2 requests today
    today_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    with SessionLocal() as db:
        db.query(GlobalApiUsage).delete()
        db.add(GlobalApiUsage(date=today_str, call_count=2))
        db.commit()
    
    mock_instance = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "Success"
    mock_instance.generate_content.return_value = mock_response
    mock_model.return_value = mock_instance

    headers = {}
    
    res = client.post("/api/assistant/chat", json={"message": "Exceed"})
    assert res.status_code == 200
    data = res.json()
    assert data["is_success"] is False
    assert "daily global limit" in data["response"]
