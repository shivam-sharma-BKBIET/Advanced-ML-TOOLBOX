import io
import logging
import pandas as pd
import numpy as np
import json
import uuid
import datetime
from backend.database import SessionLocal, DataStudioLog
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends, Request
from fastapi.responses import StreamingResponse
from backend.limiter import limiter

from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error

from backend.schemas.data_studio import (
    OHEWeightInput, OHEAnalysisResponse, OHEWeightResult,
    CSVAnalysisResponse, CSVImputeResponse, ColumnStat,
    DataQualityScore, DuplicateStats, ClassImbalance, ExtendedAnalysisResponse, TransformRequest
)

router = APIRouter(prefix="/api/studio", tags=["Data Studio & Cleaning"])
logger = logging.getLogger(__name__)

# --- IN-MEMORY SESSION CACHE ---
# Stores { session_id: {"df": pd.DataFrame, "timestamp": datetime} }
_dataframe_cache = {}
CACHE_TTL_SECONDS = 3600

def _get_cached_df(session_id: str) -> pd.DataFrame:
    cached = _dataframe_cache.get(session_id)
    if not cached:
        raise HTTPException(status_code=404, detail="Session expired or not found. Please re-upload your file.")
    if (datetime.datetime.utcnow() - cached["timestamp"]).total_seconds() > CACHE_TTL_SECONDS:
        del _dataframe_cache[session_id]
        raise HTTPException(status_code=404, detail="Session expired. Please re-upload your file.")
    # Update timestamp on access
    _dataframe_cache[session_id]["timestamp"] = datetime.datetime.utcnow()
    return cached["df"]

def _save_cached_df(session_id: str, df: pd.DataFrame):
    _dataframe_cache[session_id] = {
        "df": df,
        "timestamp": datetime.datetime.utcnow()
    }


def validate_and_read_file(file: UploadFile) -> pd.DataFrame:
    filename = file.filename.lower()
    if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".json")):
        raise HTTPException(status_code=400, detail="Only CSV, XLSX, and JSON files are supported.")
    
    try:
        content = file.file.read()
        file_size = len(content)
        if file_size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Uploaded file size exceeds the 5MB safety limit.")
        
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(content))
        elif filename.endswith(".json"):
            df = pd.read_json(io.BytesIO(content))
            
        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
            
        return df
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {str(e)}")


def _compute_column_stats(df: pd.DataFrame) -> list[ColumnStat]:
    stats_list = []
    for col in df.columns:
        series = df[col]
        missing_count = int(series.isna().sum())
        missing_pct = float(round((missing_count / len(df)) * 100, 2)) if len(df) > 0 else 0.0
        
        mean_val = None
        min_val = None
        max_val = None
        iqr_bounds = None
        z_bounds = None
        suggestion = None
        
        if pd.api.types.is_numeric_dtype(series):
            clean_series = series.dropna()
            if not clean_series.empty:
                mean_val = float(round(clean_series.mean(), 4))
                min_val = float(round(clean_series.min(), 4))
                max_val = float(round(clean_series.max(), 4))
                
                std_val = float(clean_series.std()) if len(clean_series) > 1 else 0.0
                if std_val > 0:
                    z_bounds = [float(round(mean_val - 3 * std_val, 4)), float(round(mean_val + 3 * std_val, 4))]
                
                q1 = float(clean_series.quantile(0.25))
                q3 = float(clean_series.quantile(0.75))
                iqr = q3 - q1
                iqr_bounds = [float(round(q1 - 1.5 * iqr, 4)), float(round(q3 + 1.5 * iqr, 4))]
                
                skew = float(clean_series.skew()) if len(clean_series) > 2 else 0.0
                if abs(skew) > 1.5:
                    suggestion = "Highly skewed. Consider log transformation."
                elif missing_pct > 30:
                    suggestion = f"{missing_pct}% missing. Consider dropping or advanced imputation."
                elif missing_pct > 0:
                    suggestion = "Contains missing values. Use imputation (mean/median)."
        else:
            nunique = series.nunique()
            if nunique == 1:
                suggestion = "Constant value. Safe to drop."
            elif nunique > 15 and nunique < len(df) * 0.9:
                suggestion = "High cardinality. Consider target encoding instead of OHE."
            elif missing_pct > 0:
                suggestion = "Contains missing values. Use most_frequent imputation."
        
        stats_list.append(ColumnStat(
            name=str(col),
            dtype=str(series.dtype),
            missing_count=missing_count,
            missing_pct=missing_pct,
            mean=mean_val,
            min=min_val,
            max=max_val,
            iqr_bounds=iqr_bounds,
            z_bounds=z_bounds,
            suggestion=suggestion
        ))
    return stats_list

def _get_clean_preview(df: pd.DataFrame, limit: int = 15) -> list[dict]:
    preview_df = df.head(limit).copy()
    preview_df = preview_df.replace({np.nan: None})
    
    # Handle datetime serialization
    for col in preview_df.select_dtypes(include=['datetime64']).columns:
        preview_df[col] = preview_df[col].astype(str)
        
    return preview_df.to_dict(orient="records")

def _compute_quality_score(df: pd.DataFrame, exact_dup: int) -> DataQualityScore:
    total_cells = df.size
    total_missing = df.isna().sum().sum()
    completeness = 100.0 * (1 - (total_missing / total_cells)) if total_cells > 0 else 100.0
    
    total_rows = len(df)
    uniqueness = 100.0 * (1 - (exact_dup / total_rows)) if total_rows > 0 else 100.0
    
    outlier_cells = 0
    numeric_cols = df.select_dtypes(include=np.number)
    for col in numeric_cols:
        series = df[col].dropna()
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        outlier_cells += ((series < (q1 - 1.5 * iqr)) | (series > (q3 + 1.5 * iqr))).sum()
        
    outliers = 100.0 * (1 - (outlier_cells / (numeric_cols.size or 1)))
    
    # Very basic consistency: mixed types check
    mixed_cols = 0
    for col in df.columns:
        types = df[col].dropna().map(type).nunique()
        if types > 1:
            mixed_cols += 1
    consistency = 100.0 * (1 - (mixed_cols / len(df.columns))) if len(df.columns) > 0 else 100.0
    
    overall_score = int(0.4 * completeness + 0.3 * uniqueness + 0.15 * outliers + 0.15 * consistency)
    
    summary = f"Your dataset is {overall_score}% clean. "
    if completeness < 90:
        summary += f"Held back by {round(100 - completeness, 1)}% missing values. "
    if uniqueness < 95:
        summary += f"Contains {round(100 - uniqueness, 1)}% duplicate rows. "
    if overall_score >= 90:
        summary = f"Excellent! Your dataset is {overall_score}% clean and ready for modeling."
        
    return DataQualityScore(
        overall_score=overall_score,
        completeness=round(completeness, 2),
        uniqueness=round(uniqueness, 2),
        consistency=round(consistency, 2),
        outliers=round(outliers, 2),
        summary=summary
    )


@router.post("/upload")
@limiter.limit("20/hour")
async def upload_dataset(
    request: Request,
    file: UploadFile = File(...)
):
    df = validate_and_read_file(file)
    session_id = str(uuid.uuid4())
    _save_cached_df(session_id, df)

    # Log to DataStudioLog
    db = SessionLocal()
    try:
        log_entry = DataStudioLog(filename=file.filename)
        db.add(log_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log data studio usage: {e}")
    finally:
        db.close()

    
    return {"session_id": session_id, "filename": file.filename, "message": "Dataset loaded successfully into cache."}


@router.get("/{session_id}/analyze", response_model=ExtendedAnalysisResponse)
@limiter.limit("60/minute")
def analyze_dataset(
    request: Request,
    session_id: str,
    target_column: str = Query(None)
):
    df = _get_cached_df(session_id)
    
    stats = _compute_column_stats(df)
    preview = _get_clean_preview(df, 12)
    
    # Duplicates
    exact_duplicates = int(df.duplicated(keep=False).sum())
    # Near duplicates (off by one column) - heuristic: if N-1 columns match
    near_duplicates = 0
    if len(df.columns) > 1 and len(df) < 20000:  # Prevent memory exhaustion on huge dfs
        for col in df.columns:
            subset = [c for c in df.columns if c != col]
            # Add to near_duplicates count if duplicated on subset but NOT exactly duplicated
            near_dup_mask = df.duplicated(subset=subset, keep=False) & ~df.duplicated(keep=False)
            near_duplicates += int(near_dup_mask.sum())
            
    dup_stats = DuplicateStats(
        exact_duplicates=exact_duplicates,
        near_duplicates=near_duplicates
    )
    
    q_score = _compute_quality_score(df, exact_duplicates)
    
    imbalance = None
    if target_column and target_column in df.columns:
        if not pd.api.types.is_numeric_dtype(df[target_column]) or df[target_column].nunique() < 20:
            counts = df[target_column].value_counts(normalize=True)
            if len(counts) > 0:
                minority_class = str(counts.idxmin())
                minority_pct = float(counts.min() * 100)
                is_imbalanced = minority_pct < 10.0
                
                msg = "Balanced"
                if is_imbalanced:
                    msg = f"Warning: Highly imbalanced. '{minority_class}' is only {round(minority_pct,1)}% of data."
                    
                imbalance = ClassImbalance(
                    is_imbalanced=is_imbalanced,
                    minority_class=minority_class,
                    minority_pct=round(minority_pct, 2),
                    message=msg,
                    distribution={str(k): float(v*100) for k, v in counts.items()}
                )
    
    corr_matrix = []
    numeric_df = df.select_dtypes(include=np.number)
    if not numeric_df.empty:
        corr = numeric_df.corr().round(2)
        for col in corr.columns:
            row_dict = {"column": col}
            for row_idx in corr.index:
                val = corr.loc[row_idx, col]
                row_dict[row_idx] = float(val) if not pd.isna(val) else 0.0
            corr_matrix.append(row_dict)

    return ExtendedAnalysisResponse(
        session_id=session_id,
        filename="cached_dataset",
        row_count=len(df),
        col_count=len(df.columns),
        columns=df.columns.tolist(),
        stats=stats,
        preview=preview,
        quality_score=q_score,
        duplicates=dup_stats,
        imbalance=imbalance,
        correlation_matrix=corr_matrix
    )


@router.post("/{session_id}/transform")
@limiter.limit("30/minute")
def transform_dataset(
    request: Request,
    session_id: str,
    payload: TransformRequest
):
    df = _get_cached_df(session_id).copy()
    
    # 1. Duplicates
    if payload.dedup_strategy == "keep_first":
        df = df.drop_duplicates(keep="first")
    elif payload.dedup_strategy == "keep_last":
        df = df.drop_duplicates(keep="last")
    elif payload.dedup_strategy == "drop":
        df = df.drop_duplicates(keep=False)
        
    # 2. Feature Eng: Dates
    if payload.date_extract_col and payload.date_extract_col in df.columns:
        col = payload.date_extract_col
        try:
            df[col] = pd.to_datetime(df[col])
            df[f"{col}_year"] = df[col].dt.year
            df[f"{col}_month"] = df[col].dt.month
            df[f"{col}_day"] = df[col].dt.day
            df[f"{col}_dow"] = df[col].dt.dayofweek
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse dates in {col}: {str(e)}")
            
    # 3. Feature Eng: Ratios
    if payload.ratio_num_col and payload.ratio_den_col:
        num = payload.ratio_num_col
        den = payload.ratio_den_col
        if num in df.columns and den in df.columns:
            df[f"{num}_per_{den}"] = df[num] / df[den].replace(0, np.nan)
            
    # 4. Feature Eng: Binning
    if payload.bin_col and payload.bin_col in df.columns:
        col = payload.bin_col
        b_count = max(2, payload.bin_count or 5)
        if payload.bin_method == "quantile":
            df[f"{col}_binned"] = pd.qcut(df[col], q=b_count, duplicates='drop').astype(str)
        else: # auto / equal-width
            df[f"{col}_binned"] = pd.cut(df[col], bins=b_count).astype(str)

    _save_cached_df(session_id, df)

    # Log to DataStudioLog
    db = SessionLocal()
    try:
        log_entry = DataStudioLog(filename=file.filename)
        db.add(log_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log data studio usage: {e}")
    finally:
        db.close()

    
    return {"message": "Transformations applied successfully", "preview": _get_clean_preview(df, 12)}


@router.get("/{session_id}/export-training")
@limiter.limit("10/hour")
def export_training(
    request: Request,
    session_id: str
):
    df = _get_cached_df(session_id)
    output_stream = io.StringIO()
    df.to_csv(output_stream, index=False)
    output_stream.seek(0)
    
    response_bytes = io.BytesIO(output_stream.getvalue().encode("utf-8"))
    
    return StreamingResponse(
        response_bytes,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=cleaned_training_data_{session_id[:8]}.csv",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

# Keeping OHE analysis for backward compatibility
@router.post("/analyze-ohe-weights", response_model=OHEAnalysisResponse)
@limiter.limit("20/minute")
async def analyze_ohe_weights(
    request: Request,
    payload: OHEWeightInput
):
    try:
        categories = np.array(payload.categories).reshape(-1, 1)
        targets = np.array(payload.targets)
        ohe = OneHotEncoder(drop="first", sparse_output=False, handle_unknown="error")
        try:
            X_encoded = ohe.fit_transform(categories)
        except Exception as ohe_err:
            raise HTTPException(status_code=422, detail=f"OHE failed: {str(ohe_err)}")
        reg = LinearRegression()
        reg.fit(X_encoded, targets)
        intercept = float(reg.intercept_)
        coefs = reg.coef_
        predictions = reg.predict(X_encoded)
        r2 = float(r2_score(targets, predictions))
        mae = float(mean_absolute_error(targets, predictions))
        if np.isnan(r2) or np.isinf(r2):
            r2 = 1.0 if np.allclose(targets, predictions) else 0.0
        feature_names = ohe.get_feature_names_out(["category"])
        dropped_category = str(ohe.categories_[0][0])
        weights_list = [OHEWeightResult(feature_name=f"{dropped_category} (Baseline)", weight=0.0)]
        for name, coef in zip(feature_names, coefs):
            weights_list.append(OHEWeightResult(feature_name=name.replace("category_", ""), weight=round(float(coef), 4)))
        return OHEAnalysisResponse(intercept=round(intercept, 4), weights=weights_list, r2_score=round(r2, 4), mae=round(mae, 4))
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
