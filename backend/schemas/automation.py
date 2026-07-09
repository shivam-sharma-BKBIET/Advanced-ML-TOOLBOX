import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional

class TwilioWhatsAppRequest(BaseModel):
    recipient: str = Field(..., description="Recipient phone number in E.164 format, e.g. +1234567890")
    message: str = Field(..., min_length=1, max_length=1600, description="The message body to send via WhatsApp")
    sandbox: bool = Field(True, description="Whether to run in sandbox simulation mode (free) or send live message")

    @field_validator("recipient")
    @classmethod
    def validate_e164_phone(cls, v: str) -> str:
        pattern = r"^\+[1-9]\d{1,14}$"
        if not re.match(pattern, v):
            raise ValueError("Recipient phone number must be in E.164 format (e.g., +1234567890)")
        return v

class WebIntentWhatsAppRequest(BaseModel):
    recipient: str = Field(..., description="Recipient phone number (digits only or E.164 format)")
    message: str = Field(..., description="Pre-filled message text to encode")

class EmailSendRequest(BaseModel):
    recipient: str = Field(..., description="Recipient email address")
    subject: str = Field(..., min_length=1, max_length=200, description="Subject of the email")
    body: str = Field(..., min_length=1, description="Body of the email")
    sandbox: bool = Field(True, description="Whether to run in sandbox simulation mode (free) or send live email")

    @field_validator("recipient")
    @classmethod
    def validate_email(cls, v: str) -> str:
        email_pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
        if not re.match(email_pattern, v):
            raise ValueError("Invalid email address format")
        return v
