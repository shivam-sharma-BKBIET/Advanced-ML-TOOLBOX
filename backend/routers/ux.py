import os
import pandas as pd
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from backend.limiter import limiter
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter(prefix="/api/samples", tags=["UX Enhancements"])

# Cache sample metadata in memory
_sample_metadata_cache = []

SAMPLES_DIR = "backend/samples"
SAMPLE_DESCRIPTIONS = {
    "salary_sample.csv": "A clean dataset for predicting salaries based on experience and education.",
    "laptops_sample.csv": "A clean dataset containing laptop specifications and prices.",
    "messy_studio_demo.csv": "A corrupted dataset with missing values, exact and near duplicates, and extreme outliers. Perfect for testing Data Studio.",
    "batch_predict_demo.csv": "A mid-sized, clean dataset perfect for demonstrating Batch Prediction throughput with the Salary model."
}

class SampleMetadata(BaseModel):
    id: str
    name: str
    description: str
    row_count: int
    col_count: int
    preview: List[Dict[str, Any]]

@router.get("", response_model=List[SampleMetadata])
@limiter.limit("30/minute")
def list_samples(request: Request):
    global _sample_metadata_cache
    if _sample_metadata_cache:
        return _sample_metadata_cache
        
    if not os.path.exists(SAMPLES_DIR):
        return []
        
    samples = []
    for filename in os.listdir(SAMPLES_DIR):
        if filename.endswith(".csv"):
            filepath = os.path.join(SAMPLES_DIR, filename)
            try:
                df = pd.read_csv(filepath)
                # handle nan for preview
                preview_df = df.head(3).replace({pd.NA: None, float('nan'): None})
                
                samples.append(SampleMetadata(
                    id=filename,
                    name=filename.replace(".csv", "").replace("_", " ").title(),
                    description=SAMPLE_DESCRIPTIONS.get(filename, "A sample dataset."),
                    row_count=len(df),
                    col_count=len(df.columns),
                    preview=preview_df.to_dict(orient="records")
                ))
            except Exception as e:
                print(f"Error loading {filename}: {e}")
                
    _sample_metadata_cache = samples
    return samples

@router.get("/{sample_id}/download")
@limiter.limit("30/minute")
def download_sample(request: Request, sample_id: str):
    if not sample_id.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid sample format")
        
    filepath = os.path.join(SAMPLES_DIR, sample_id)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Sample not found")
        
    return FileResponse(
        path=filepath, 
        filename=sample_id, 
        media_type="text/csv",
        headers={"Access-Control-Expose-Headers": "Content-Disposition"}
    )
