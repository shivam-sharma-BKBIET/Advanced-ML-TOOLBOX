import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # API & CORS
    PROJECT_NAME: str = "Multi-Utility Automation & ML Dashboard"
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "")

    @property
    def cors_origins(self) -> list[str]:
        if self.CORS_ORIGINS:
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if self.ENVIRONMENT == "production":
            return ["http://localhost:8080", "http://127.0.0.1:8080"]
        return ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    
    # Auth & Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ml_toolbox.db")
    
    # Twilio API Settings (WhatsApp, SMS, etc.)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "ACmockaccountsd1234567890abcdef")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "mockauthtoken1234567890abcdef")
    TWILIO_WHATSAPP_NUMBER: str = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
    
    # SMTP Settings (Gmail or similar)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "example@gmail.com")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "mockpassword")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "example@gmail.com")

    # AI Config
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL_NAME: str = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")
    GEMINI_DAILY_GLOBAL_CAP: int = int(os.getenv("GEMINI_DAILY_GLOBAL_CAP", "1200"))
    GEMINI_DAILY_USER_CAP: int = int(os.getenv("GEMINI_DAILY_USER_CAP", "30"))

    # Local storage for saved models
    MODEL_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models_data")

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        extra = "ignore"

settings = Settings()

# Ensure model directory exists
os.makedirs(settings.MODEL_DIR, exist_ok=True)
