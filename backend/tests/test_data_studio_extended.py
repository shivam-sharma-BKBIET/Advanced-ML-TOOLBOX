import pytest
import pandas as pd
import json
import io
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def create_mock_csv():
    # Includes exact duplicates, near duplicates, outliers, missing values
    data = """id,age,income,category,date
1,25,50000,A,2023-01-01
2,30,60000,B,2023-01-02
1,25,50000,A,2023-01-01
4,40,80000,C,2023-01-04
4,40,80000,D,2023-01-04
6,200,900000,A,2023-01-06
7,,70000,B,
"""
    return io.BytesIO(data.encode('utf-8'))

def test_upload_and_analyze():
    # 1. Upload
    file_bytes = create_mock_csv()
    res_upload = client.post(
        "/api/studio/upload",
        files={"file": ("test.csv", file_bytes, "text/csv")}
    )
    assert res_upload.status_code == 200
    session_id = res_upload.json()["session_id"]
    
    # 2. Analyze
    res_analyze = client.get(f"/api/studio/{session_id}/analyze?target_column=category")
    assert res_analyze.status_code == 200
    data = res_analyze.json()
    
    # Check duplicates
    assert data["duplicates"]["exact_duplicates"] >= 2  # Row 1 and 3 are exact
    assert data["duplicates"]["near_duplicates"] >= 2   # Row 4 and 5 are near (differ in category)
    
    # Check quality score (should be heavily penalized by duplicates, missing, outliers)
    assert data["quality_score"]["overall_score"] < 100
    assert "clean" in data["quality_score"]["summary"]
    
    # 3. Transform (Dedup, bin, extract date)
    transform_payload = {
        "dedup_strategy": "keep_first",
        "date_extract_col": "date",
        "bin_col": "age",
        "bin_method": "auto",
        "bin_count": 3,
        "ratio_num_col": "income",
        "ratio_den_col": "age",
        "impute_strategy": "mean"
    }
    res_transform = client.post(f"/api/studio/{session_id}/transform", json=transform_payload)
    assert res_transform.status_code == 200
    
    # 4. Re-analyze to confirm transformations
    res_reanalyze = client.get(f"/api/studio/{session_id}/analyze")
    assert res_reanalyze.status_code == 200
    new_data = res_reanalyze.json()
    
    cols = new_data["columns"]
    assert "date_year" in cols
    assert "age_binned" in cols
    assert "income_per_age" in cols
    
    # Exact duplicates should be 0 now
    assert new_data["duplicates"]["exact_duplicates"] == 0
    
    # 5. Export
    res_export = client.get(f"/api/studio/{session_id}/export-training")
    assert res_export.status_code == 200
    assert "text/csv" in res_export.headers["content-type"]
    exported_text = res_export.content.decode("utf-8")
    assert "age_binned" in exported_text
