import math
import json
import datetime
import logging
import pandas as pd
import numpy as np
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db, TrainingRun, PredictionLog

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ml", tags=["Model Drift"])

# Simple in-memory cache: { "model_name": {"timestamp": datetime, "data": dict} }
_drift_cache = {}
CACHE_TTL_SECONDS = 3600  # 1 hour

def calculate_psi(expected_dist: list, actual_dist: list) -> float:
    """Calculate Population Stability Index (PSI) between two distributions."""
    psi = 0.0
    for e, a in zip(expected_dist, actual_dist):
        # Avoid division by zero and log(0)
        e_adj = max(e, 0.0001)
        a_adj = max(a, 0.0001)
        psi += (a_adj - e_adj) * math.log(a_adj / e_adj)
    return psi

def compute_numeric_drift(live_series: pd.Series, baseline_stats: dict) -> dict:
    """Compute PSI for a numeric feature based on baseline quantiles."""
    quantiles = baseline_stats.get("quantiles", [])
    if not quantiles:
        return {"psi": 0.0, "status": "stable", "error": "No quantiles in baseline"}
        
    # We have 9 quantiles, which create 10 bins.
    # Add -inf and inf to cover all possible values.
    bins = [-float("inf")] + quantiles + [float("inf")]
    
    # Baseline expected distribution: 10% in each of the 10 bins if based on quantiles
    expected_dist = [0.1] * 10
    
    # Live actual distribution
    counts, _ = np.histogram(live_series.dropna(), bins=bins)
    total = sum(counts)
    if total == 0:
        return {"psi": 0.0, "status": "stable", "error": "No valid data"}
        
    actual_dist = [c / total for c in counts]
    
    psi = calculate_psi(expected_dist, actual_dist)
    
    status = "stable"
    if psi > 0.25:
        status = "significant drift"
    elif psi > 0.10:
        status = "moderate drift"
        
    return {"psi": round(psi, 4), "status": status}

def compute_categorical_drift(live_series: pd.Series, baseline_stats: dict) -> dict:
    """Compute PSI for a categorical feature."""
    live_counts = live_series.value_counts(normalize=True).to_dict()
    
    # Get all unique categories from both baseline and live
    all_cats = set(baseline_stats.keys()).union(set(live_counts.keys()))
    
    expected_dist = []
    actual_dist = []
    
    for cat in all_cats:
        expected_dist.append(float(baseline_stats.get(cat, 0.0)))
        actual_dist.append(float(live_counts.get(cat, 0.0)))
        
    psi = calculate_psi(expected_dist, actual_dist)
    
    status = "stable"
    if psi > 0.25:
        status = "significant drift"
    elif psi > 0.10:
        status = "moderate drift"
        
    return {"psi": round(psi, 4), "status": status}


@router.get("/{model_name}/drift-report")
def get_drift_report(model_name: str, db: Session = Depends(get_db)):
    """Computes or retrieves cached Model Drift report using Population Stability Index."""
    
    # 1. Check cache
    now = datetime.datetime.utcnow()
    cached = _drift_cache.get(model_name)
    if cached and (now - cached["timestamp"]).total_seconds() < CACHE_TTL_SECONDS:
        return cached["data"]
        
    # 2. Get active model version
    active_run = db.query(TrainingRun).filter(
        TrainingRun.model_name == model_name,
        TrainingRun.is_active == True
    ).first()
    
    if not active_run:
        raise HTTPException(status_code=404, detail=f"No active model version found for {model_name}")
        
    if not active_run.baseline_stats:
        # Backward compatibility / not trained yet
        return {
            "status": "not_enough_data", 
            "message": "Baseline statistics are missing. Please retrain the model."
        }
        
    baseline_stats = json.loads(active_run.baseline_stats)
    
    # 3. Get recent live predictions (last 30 days)
    thirty_days_ago = now - datetime.timedelta(days=30)
    logs = db.query(PredictionLog).filter(
        PredictionLog.model_name == model_name,
        PredictionLog.model_version == str(active_run.version_num),
        PredictionLog.created_at >= thirty_days_ago
    ).all()
    
    if len(logs) < 30:
        return {
            "status": "not_enough_data",
            "message": f"Drift monitoring will activate once {30 - len(logs)} more predictions are logged.",
            "prediction_count": len(logs),
            "required_count": 30
        }
        
    # 4. Extract payloads into DataFrame
    payloads = [json.loads(log.input_payload) for log in logs]
    df = pd.DataFrame(payloads)
    
    # 5. Compute drift
    feature_drift = {}
    worst_psi = 0.0
    overall_status = "stable"
    
    # Numeric features
    for col, b_stats in baseline_stats.get("numeric", {}).items():
        if col in df.columns:
            # Ensure numeric type
            df[col] = pd.to_numeric(df[col], errors='coerce')
            drift_res = compute_numeric_drift(df[col], b_stats)
            feature_drift[col] = {
                "type": "numeric",
                **drift_res
            }
            if drift_res["psi"] > worst_psi:
                worst_psi = drift_res["psi"]
                
    # Categorical features
    for col, b_stats in baseline_stats.get("categorical", {}).items():
        if col in df.columns:
            # Convert to string to match baseline keys
            df[col] = df[col].astype(str)
            drift_res = compute_categorical_drift(df[col], b_stats)
            feature_drift[col] = {
                "type": "categorical",
                **drift_res
            }
            if drift_res["psi"] > worst_psi:
                worst_psi = drift_res["psi"]
                
    if worst_psi > 0.25:
        overall_status = "significant drift"
    elif worst_psi > 0.10:
        overall_status = "moderate drift"
        
    report = {
        "status": "active",
        "overall_status": overall_status,
        "max_psi": round(worst_psi, 4),
        "prediction_count": len(logs),
        "baseline_timestamp": active_run.timestamp.isoformat(),
        "comparison_window_days": 30,
        "features": feature_drift
    }
    
    # 6. Cache and return
    _drift_cache[model_name] = {
        "timestamp": now,
        "data": report
    }
    
    return report

