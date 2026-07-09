from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any

class OHEWeightInput(BaseModel):
    categories: List[str] = Field(..., description="List of categorical feature entries")
    targets: List[float] = Field(..., description="Target labels/values associated with each category")

    @field_validator("targets")
    @classmethod
    def check_matching_lengths(cls, targets: List[float], info) -> List[float]:
        categories = info.data.get("categories")
        if categories is not None and len(categories) != len(targets):
            raise ValueError("The 'categories' and 'targets' lists must have the exact same length")
        if len(targets) < 3:
            raise ValueError("Please provide at least 3 records for OHE analysis")
        return targets

class OHEWeightResult(BaseModel):
    feature_name: str
    weight: float

class OHEAnalysisResponse(BaseModel):
    intercept: float = Field(..., description="Linear regression model baseline intercept")
    weights: List[OHEWeightResult] = Field(..., description="Adjustments relative to the baseline category")
    r2_score: float = Field(0.0, description="R-squared score of the regression fit")
    mae: float = Field(0.0, description="Mean Absolute Error of the regression fit")

# --- NEW SCHEMAS FOR INTERACTIVE CSV CLEANING ---

class ColumnStat(BaseModel):
    name: str
    dtype: str
    missing_count: int
    missing_pct: float
    mean: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    suggestion: Optional[str] = None
    iqr_bounds: Optional[List[float]] = None
    z_bounds: Optional[List[float]] = None

class CSVAnalysisResponse(BaseModel):
    filename: str
    row_count: int
    col_count: int
    columns: List[str]
    stats: List[ColumnStat]
    preview: List[Dict[str, Any]]
    correlation_matrix: Optional[List[Dict[str, Any]]] = None

class CSVImputeResponse(BaseModel):
    stats_before: List[ColumnStat]
    stats_after: List[ColumnStat]
    preview_before: List[Dict[str, Any]]
    preview_after: List[Dict[str, Any]]
    cleaned_csv: str


class DataQualityScore(BaseModel):
    overall_score: int
    completeness: float
    uniqueness: float
    consistency: float
    outliers: float
    summary: str

class DuplicateStats(BaseModel):
    exact_duplicates: int
    near_duplicates: int

class ClassImbalance(BaseModel):
    is_imbalanced: bool
    minority_class: Optional[str]
    minority_pct: float
    message: str
    distribution: Dict[str, float]

class ExtendedAnalysisResponse(BaseModel):
    session_id: str
    filename: str
    row_count: int
    col_count: int
    columns: List[str]
    stats: List[ColumnStat]
    preview: List[Dict[str, Any]]
    quality_score: DataQualityScore
    duplicates: DuplicateStats
    imbalance: Optional[ClassImbalance] = None
    correlation_matrix: Optional[List[Dict[str, Any]]] = None

class TransformRequest(BaseModel):
    dedup_strategy: Optional[str] = None  # keep_first, keep_last, drop
    target_column: Optional[str] = None
    # Feature Engineering
    date_extract_col: Optional[str] = None
    ratio_num_col: Optional[str] = None
    ratio_den_col: Optional[str] = None
    bin_col: Optional[str] = None
    bin_method: Optional[str] = None  # auto, quantile
    bin_count: Optional[int] = 5
    # Imputation
    impute_strategy: Optional[str] = "mean"
