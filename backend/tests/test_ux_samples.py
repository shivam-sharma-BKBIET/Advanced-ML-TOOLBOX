import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_list_samples():
    res = client.get("/api/samples")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 4
    
    # Check if messy_studio_demo.csv is in the list
    sample_ids = [s["id"] for s in data]
    assert "messy_studio_demo.csv" in sample_ids
    
    # Check structure
    sample = data[0]
    assert "id" in sample
    assert "name" in sample
    assert "description" in sample
    assert "row_count" in sample
    assert "col_count" in sample
    assert "preview" in sample

def test_download_sample():
    res = client.get("/api/samples/messy_studio_demo.csv/download")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "messy_studio_demo.csv" in res.headers["content-disposition"]
    
    csv_content = res.content.decode("utf-8")
    assert "id,age,income,category,join_date" in csv_content

def test_download_sample_invalid():
    res = client.get("/api/samples/invalid_sample.csv/download")
    assert res.status_code == 404
