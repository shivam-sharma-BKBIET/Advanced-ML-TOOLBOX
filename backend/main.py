import logging
from logging.handlers import RotatingFileHandler
import os
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from backend.limiter import limiter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import settings
from backend.routers import auth, automation, machine_learning, data_studio, history, analytics, assistant, drift, ux
from backend.models.mini_llm import simulate_token_generation

from backend.database import init_db, User
from backend.routers.machine_learning import _log_prediction

# Setup logging configuration with file rotation
os.makedirs("logs", exist_ok=True)
file_handler = RotatingFileHandler(
    "logs/ml_toolbox.log",
    maxBytes=5 * 1024 * 1024,  # 5MB limit
    backupCount=3,
    encoding="utf-8"
)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        file_handler
    ]
)
logger = logging.getLogger("backend.main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-Ready Multi-Utility Automation & Machine Learning Dashboard",
    version="1.0.0"
)

# Attach rate limiter to app state and register error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        loc = " -> ".join(str(x) for x in error.get("loc", []))
        msg = error.get("msg", "Invalid value")
        errors.append(f"{loc}: {msg}")
    return JSONResponse(
        status_code=422,
        content={"detail": f"Validation error: {', '.join(errors)}"}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled system error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred."}
    )

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup lifecycle hooks to pre-compile and verify ML pipelines
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing Multi-Utility Backend database...")
    init_db()
    logger.info("Loading versioned models from registry...")

    # Use a dedicated DB session for startup seeding
    from backend.database import SessionLocal
    from backend.routers.machine_learning import (
        load_or_train_fallback_salary,
        load_or_train_fallback_laptop,
        load_or_train_fallback_llm,
    )
    db = SessionLocal()
    try:
        load_or_train_fallback_salary(db)
        load_or_train_fallback_laptop(db)
        load_or_train_fallback_llm(db)
    finally:
        db.close()

    logger.info("All model versions seeded. Services started successfully.")

# Root health-check endpoint
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "features": {
            "automation": ["whatsapp_twilio", "smtp_email"],
            "machine_learning": ["salary_predictor", "resume_parser", "electricity_forecaster", "laptop_pricing", "sentiment_analyzer"],
            "data_studio": ["csv_imputation", "ohe_weight_analysis"],
            "deep_learning": ["pytorch_sequence_simulator"]
        }
    }

# PyTorch Deep Learning Simulator Route
class SimulatorRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Sequence prompt seed")
    max_new_tokens: int = Field(12, ge=1, le=50, description="Max new tokens to generate")
    temperature: float = Field(0.85, ge=0.1, le=2.0, description="Sampling temperature (0.1=focused, 2.0=creative)")

@app.post("/api/simulator/mini-llm")
async def run_llm_simulator(payload: SimulatorRequest, bg_tasks: BackgroundTasks):
    """
    Runs token-by-token generation using a trained 2-layer LSTM MiniLLM.
    Uses temperature sampling (not argmax) so different prompts produce different outputs.
    Returns per-step top-5 softmax distributions for visualization.
    """
    try:
        results = simulate_token_generation(
            payload.prompt,
            payload.max_new_tokens,
            payload.temperature
        )
        bg_tasks.add_task(
            _log_prediction,
            None,
            "mini_llm",
            "v1.0",
            {"prompt": payload.prompt, "max_new_tokens": payload.max_new_tokens, "temperature": payload.temperature},
            {"final_text": results.get("final_text", "")},
            None
        )
        return results
    except Exception as e:
        logger.error(f"PyTorch LLM simulation failure: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Deep Learning Simulator Execution Error: {str(e)}"
        )

# Register modular sub-routers
app.include_router(auth.router)
app.include_router(automation.router)
app.include_router(machine_learning.router)
app.include_router(data_studio.router)
app.include_router(history.router)
app.include_router(analytics.router)
app.include_router(assistant.router)
app.include_router(drift.router)
app.include_router(ux.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
