import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.main import app
from backend.database import Base, get_db

client = TestClient(app)

def test_history_predictions_access():
    headers = {}
    response = client.get("/api/history/predictions")
    assert response.status_code == 200
    assert "data" in response.json()
    assert "total" in response.json()

def test_history_messages_access():
    headers = {}
    response = client.get("/api/history/messages")
    assert response.status_code == 200
    assert "data" in response.json()

def test_export_csv_predictions():
    headers = {}
    response = client.get("/api/history/predictions/export")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")

def test_export_pdf_predictions():
    headers = {}
    response = client.get("/api/history/predictions/export-pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-")

def test_export_csv_messages():
    headers = {}
    response = client.get("/api/history/messages/export")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
