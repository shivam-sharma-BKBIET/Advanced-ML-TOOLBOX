import re
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime


# SHAP Explanation schemas
class FeatureContribution(BaseModel):
    feature: str = Field(..., description="Feature name")
    value: float = Field(..., description="Raw input value for this feature")
    contribution: float = Field(..., description="SHAP contribution value")
    direction: str = Field(..., description="'positive' or 'negative'")

class ExplanationResult(BaseModel):
    contributions: List[FeatureContribution] = Field(default_factory=list, description="Per-feature SHAP breakdown sorted by |contribution|")
    base_value: float = Field(0.0, description="SHAP expected value (model mean prediction)")
    error: Optional[str] = Field(None, description="Error message if SHAP computation failed")

# Salary Predictor schemas
class SalaryRecord(BaseModel):
    experience: int = Field(..., ge=0, le=50, description="Years of experience")
    education: str = Field(..., description="Education level: Bachelors, Masters, or PhD")
    skill_score: int = Field(..., ge=0, le=100, description="Skill rating from 0 to 100")
    company_size: str = Field(..., description="Company scale: Small, Medium, or Large")

class SalaryPredictionInput(BaseModel):
    payload: List[SalaryRecord] = Field(..., min_length=1, description="Array of records to predict salary for")
    include_explanation: bool = Field(True, description="Include SHAP feature explanation for the first record")

class SalaryPredictionOutput(BaseModel):
    predictions: List[float] = Field(..., description="Array of predicted salaries")
    explanation: Optional[ExplanationResult] = Field(None, description="SHAP feature impact breakdown (first record)")

# Laptop Pricing schemas
class LaptopSpecs(BaseModel):
    ram: int = Field(..., ge=4, le=256, description="RAM in GB (4\u2013256)")
    storage: int = Field(..., ge=128, le=8192, description="Storage size in GB (128\u20138192)")
    weight: float = Field(..., ge=0.5, le=5.0, description="Laptop weight in kg")
    screen_size: float = Field(..., ge=10.0, le=20.0, description="Screen size in inches")
    processor_speed: float = Field(..., ge=1.0, le=5.5, description="Processor clock speed in GHz")
    include_explanation: bool = Field(True, description="Include SHAP feature explanation")

class LaptopPredictionOutput(BaseModel):
    predicted_price: float = Field(..., description="Predicted laptop price in INR")
    explanation: Optional[ExplanationResult] = Field(None, description="SHAP feature impact breakdown")

# Sentiment Analyzer schemas
class SentimentInput(BaseModel):
    text: str = Field(..., min_length=1, description="Input text to analyze")

    @field_validator("text")
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        # Strip HTML tags to prevent cross-site scripting (XSS)
        clean = re.sub(r"<[^>]*?>", "", v)
        clean = clean.strip()
        if not clean:
            raise ValueError("Text input cannot be empty after sanitization")
        return clean

class SentimentOutput(BaseModel):
    polarity: float = Field(..., description="Polarity score ranging from -1.0 (negative) to 1.0 (positive)")
    sentiment_label: str = Field(..., description="Descriptive label: Highly Negative, Negative, Neutral, Positive, Highly Positive")
    subjectivity: float = Field(..., description="Subjectivity score ranging from 0.0 to 1.0")

# Electricity Tracker schemas
class ElectricityRecord(BaseModel):
    date: str = Field(..., description="Reading date, e.g. YYYY-MM-DD")
    usage_kwh: float = Field(..., ge=0, description="Electricity usage in kWh")
    cost: float = Field(..., ge=0, description="Cost of the electricity")

class ElectricityForecastInput(BaseModel):
    history: List[ElectricityRecord] = Field(..., min_length=5, description="Historical electricity readings (min 5)")

class ForecastItem(BaseModel):
    date: str
    predicted_usage_kwh: float
    predicted_cost: float

class ElectricityForecastOutput(BaseModel):
    forecast: List[ForecastItem] = Field(..., description="30-day forecast predictions")

# Batch Prediction schemas
class BatchJobResponse(BaseModel):
    job_id: str
    status: str
    row_count: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_detail: Optional[str] = None

class BatchPredictionRow(BaseModel):
    prediction: float
    explanation: Optional[ExplanationResult] = None

class BatchPredictionOutput(BaseModel):
    job_id: str
    status: str
    predictions: List[BatchPredictionRow]
