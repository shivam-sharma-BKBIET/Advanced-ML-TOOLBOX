import datetime
import logging
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
import google.generativeai as genai
from google.generativeai.types import generation_types

from backend.config import settings
from backend.database import get_db, User, AssistantLog, GlobalApiUsage
from backend.limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assistant", tags=["AI Assistant"])

# Initialize Gemini SDK
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY is missing. Assistant endpoint will gracefully fail.")


class ChatRequest(BaseModel):
    message: str
    context: dict = None  # Optional contextual data (e.g., prediction result + SHAP)


class ChatResponse(BaseModel):
    response: str
    is_success: bool


SYSTEM_PROMPT = """You are a helpful AI Assistant integrated into the 'ML Toolbox' platform. 
The ML Toolbox provides machine learning predictors including Salary Prediction, Laptop Pricing, Sentiment Analysis, and AI Resume Parsing. 
It also provides SHAP (SHapley Additive exPlanations) values to explain prediction models.
Your goal is to answer user questions about the ML Toolbox, and if they provide a specific 'Prediction Context', explain what the prediction means and why the model made that decision in simple, plain language.
Keep your answers concise, friendly, and easy to understand for someone who might not be a data scientist.
Do not hallucinate data; rely on the provided context if asked about a specific prediction.
If the user asks an unrelated question not about ML, data science, or this application, politely decline to answer.
"""


def check_and_update_limits(db: Session) -> str:
    """Checks global rate limits."""
    today_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    global_usage = db.query(GlobalApiUsage).filter(GlobalApiUsage.date == today_str).first()
    if global_usage and global_usage.call_count >= settings.GEMINI_DAILY_GLOBAL_CAP:
        return f"The AI Assistant has reached its daily global limit ({settings.GEMINI_DAILY_GLOBAL_CAP} requests). Please try again tomorrow."
    
    if not global_usage:
        global_usage = GlobalApiUsage(date=today_str, call_count=1)
        db.add(global_usage)
    else:
        global_usage.call_count += 1
    
    return None


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("30/day")
def chat_with_assistant(
    request: Request,
    payload: ChatRequest,
    db: Session = Depends(get_db)
):
    if not settings.GEMINI_API_KEY:
        return ChatResponse(
            response="The AI Assistant is currently disabled. Please configure the GEMINI_API_KEY in the environment.",
            is_success=False
        )
        
    limit_error = check_and_update_limits(db)
    if limit_error:
        # Don't fail with 429, return a friendly chat response
        return ChatResponse(response=limit_error, is_success=False)

    # Build prompt
    prompt = SYSTEM_PROMPT + "\\n\\nUser Message: " + payload.message
    if payload.context:
        try:
            context_str = json.dumps(payload.context, indent=2)
            prompt += f"\\n\\nPrediction Context:\\n{context_str}"
        except Exception:
            pass

    response_text = ""
    is_success = False

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL_NAME)
        response = model.generate_content(prompt)
        response_text = response.text
        is_success = True
    except generation_types.StopCandidateException as e:
        logger.error(f"Gemini stopped unexpectedly: {e}")
        response_text = "The AI Assistant encountered an issue generating a complete response. Please rephrase and try again."
    except Exception as e:
        logger.error(f"Gemini API Error: {e}", exc_info=True)
        response_text = "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later."
        
    # Log interaction
    log_entry = AssistantLog(
        user_id=None,
        question=payload.message,
        response=response_text,
        model_used=settings.GEMINI_MODEL_NAME,
        is_success=is_success
    )
    db.add(log_entry)
    db.commit()

    return ChatResponse(
        response=response_text,
        is_success=is_success
    )
