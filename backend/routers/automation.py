import logging
import asyncio
import smtplib
import time
from email.message import EmailMessage
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from backend.limiter import limiter
from twilio.rest import Client as TwilioClient
from backend.config import settings
from backend.schemas.automation import TwilioWhatsAppRequest, EmailSendRequest
from backend.database import User, SessionLocal, MessageLog

router = APIRouter(prefix="/api/automation", tags=["Automation & Telephony"])
logger = logging.getLogger(__name__)

# Helper to check if credentials are mock/default
def is_mock_twilio() -> bool:
    return (
        settings.TWILIO_ACCOUNT_SID.startswith("ACmock") 
        or settings.TWILIO_AUTH_TOKEN == "mockauthtoken1234567890abcdef"
        or not settings.TWILIO_ACCOUNT_SID
    )

def is_mock_smtp() -> bool:
    return (
        settings.SMTP_USERNAME == "example@gmail.com" 
        or settings.SMTP_PASSWORD == "mockpassword"
        or not settings.SMTP_USERNAME
    )

def _log_message(user_id: int, channel: str, recipient: str, message_body: str, status: str, provider_response: dict = None):
    try:
        import json
        with SessionLocal() as db:
            log_entry = MessageLog(
                user_id=user_id,
                channel=channel,
                recipient=recipient,
                message_body=message_body,
                status=status,
                provider_response=json.dumps(provider_response) if provider_response else None
            )
            db.add(log_entry)
            db.commit()
    except Exception as e:
        logger.error(f"Failed to log message to DB: {e}")

@router.post("/whatsapp/twilio")
@limiter.limit("10/minute")
async def send_whatsapp_twilio(
    request: Request,
    payload: TwilioWhatsAppRequest,
    bg_tasks: BackgroundTasks
):
    """
    Sends a WhatsApp message using Twilio API.
    If sandbox=True or mock credentials are in place, it runs in simulated sandbox mode.
    """
    try:
        # Enforce sandbox if requested or if credentials are mock
        if payload.sandbox or is_mock_twilio():
            logger.info(f"[SIMULATED SANDBOX] Sending WhatsApp to {payload.recipient}: {payload.message}")
            res = {
                "status": "simulated",
                "message_sid": "SMmockwhatsapp" + str(int(time.time())),
                "recipient": payload.recipient,
                "message": payload.message,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "info": "Executed in Sandbox Simulation Mode (100% Free)."
            }
            bg_tasks.add_task(_log_message, None, "whatsapp", payload.recipient, payload.message, "simulated", res)
            return res

        # Initialize Twilio Client dynamically
        try:
            client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        except Exception as client_err:
            raise HTTPException(
                status_code=400,
                detail=f"Twilio Client initialization failed. Check your ACCOUNT_SID and AUTH_TOKEN in .env. Detail: {str(client_err)}"
            )
        
        to_number = f"whatsapp:{payload.recipient}"
        
        # Dispatch Twilio message
        try:
            # Run blocking Twilio client dispatch in threadpool
            loop = asyncio.get_event_loop()
            message = await loop.run_in_executor(
                None,
                lambda: client.messages.create(
                    body=payload.message,
                    from_=settings.TWILIO_WHATSAPP_NUMBER,
                    to=to_number
                )
            )
            
            # Wait a short moment to fetch processing status (helps catch async delivery errors)
            await asyncio.sleep(1.0)
            message = await loop.run_in_executor(
                None,
                lambda: client.messages(message.sid).fetch()
            )
            
            if message.status in ("failed", "undelivered") or message.error_code:
                error_code = message.error_code
                error_msg = message.error_message or "Unknown delivery error"
                
                if error_code == 63007:
                    friendly_detail = (
                        f"Twilio Error 63007: The sender number '{settings.TWILIO_WHATSAPP_NUMBER}' "
                        f"is not a registered WhatsApp sender on your account. Since you are using "
                        f"the Sandbox, please make sure your .env has TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886."
                    )
                elif error_code == 63015:
                    friendly_detail = (
                        f"Twilio Error 63015: The recipient '{payload.recipient}' has not joined "
                        f"your WhatsApp Sandbox. They must send the sandbox keyword (e.g. 'join <sandbox-keyword>') "
                        f"to the sandbox number +1 415 523 8886 first."
                    )
                else:
                    friendly_detail = (
                        "Twilio API Error. If you are using a free trial account, "
                        "make sure the recipient number is verified in your Twilio Sandbox first. "
                        f"Error detail: {error_msg}"
                    )
                logger.warning(f"Twilio Live sending failed: {friendly_detail}")
                bg_tasks.add_task(_log_message, None, "whatsapp", payload.recipient, payload.message, "failed", {"error_code": error_code, "error_msg": error_msg})
                raise HTTPException(status_code=422, detail=friendly_detail)
            
            res = {
                "status": "sent",
                "message_sid": message.sid,
                "recipient": payload.recipient,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "info": "Live Twilio WhatsApp successfully transmitted."
            }
            bg_tasks.add_task(_log_message, None, "whatsapp", payload.recipient, payload.message, "sent", res)
            return res
            
        except HTTPException as http_exc:
            raise http_exc
        except Exception as twilio_api_err:
            # Catch Twilio REST errors (e.g. sandbox verification requirements)
            err_msg = str(twilio_api_err)
            error_code = getattr(twilio_api_err, "code", None)
            
            if error_code == 63007:
                friendly_detail = (
                    f"Twilio Error 63007: The sender number '{settings.TWILIO_WHATSAPP_NUMBER}' "
                    f"is not a registered WhatsApp sender on your account. Since you are using "
                    f"the Sandbox, please make sure your .env has TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886."
                )
            elif error_code == 63015:
                friendly_detail = (
                    f"Twilio Error 63015: The recipient '{payload.recipient}' has not joined "
                    f"your WhatsApp Sandbox. They must send the sandbox keyword (e.g. 'join <sandbox-keyword>') "
                    f"to the sandbox number +1 415 523 8886 first."
                )
            else:
                friendly_detail = (
                    "Twilio API Error. If you are using a free trial account, "
                    "make sure the recipient number is verified in your Twilio Sandbox first. "
                    f"Error detail: {err_msg}"
                )
            logger.warning(f"Twilio Live sending failed: {friendly_detail}")
            bg_tasks.add_task(_log_message, None, "whatsapp", payload.recipient, payload.message, "failed", {"error_code": error_code, "error_msg": err_msg})
            raise HTTPException(status_code=422, detail=friendly_detail)

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Failed to dispatch WhatsApp via Twilio: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Twilio WhatsApp Dispatch Failed: {str(e)}"
        )


def send_email_blocking(payload: EmailSendRequest):
    """
    Synchronous SMTP blocker running inside a threadpool.
    """
    msg = EmailMessage()
    msg.set_content(payload.body)
    msg["Subject"] = payload.subject
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = payload.recipient
    
    # Establish TLS connection
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)


@router.post("/email/send")
@limiter.limit("10/minute")
async def send_email(
    request: Request,
    payload: EmailSendRequest,
    bg_tasks: BackgroundTasks
):
    """
    Dispatches formal EmailMessage structure.
    If sandbox=True or mock credentials are in place, it runs in simulated sandbox mode.
    """
    try:
        if payload.sandbox or is_mock_smtp():
            logger.info(f"[SIMULATED SANDBOX] Email to {payload.recipient} | Subject: {payload.subject}")
            res = {
                "status": "simulated",
                "recipient": payload.recipient,
                "subject": payload.subject,
                "body": payload.body,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "info": "Executed in Sandbox Simulation Mode (100% Free)."
            }
            bg_tasks.add_task(_log_message, None, "email", payload.recipient, payload.body, "simulated", res)
            return res

        # Dispatch live email
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, send_email_blocking, payload)
            
            res = {
                "status": "sent",
                "recipient": payload.recipient,
                "subject": payload.subject,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "info": "Live SMTP Email successfully transmitted."
            }
            bg_tasks.add_task(_log_message, None, "email", payload.recipient, payload.body, "sent", res)
            return res
        except smtplib.SMTPAuthenticationError as auth_err:
            friendly_err = (
                "SMTP Authentication failed. If using Gmail, you MUST generate and use a Google App Password "
                "instead of your main password. Double check SMTP_USERNAME and SMTP_PASSWORD in .env."
            )
            logger.warning(friendly_err)
            bg_tasks.add_task(_log_message, None, "email", payload.recipient, payload.body, "failed", {"error": friendly_err})
            raise HTTPException(status_code=401, detail=friendly_err)
        except Exception as smtp_err:
            friendly_err = (
                f"SMTP connection or transmission failed. Ensure your host, port, and security settings are correct. "
                f"Detail: {str(smtp_err)}"
            )
            logger.warning(friendly_err)
            bg_tasks.add_task(_log_message, None, "email", payload.recipient, payload.body, "failed", {"error": friendly_err})
            raise HTTPException(status_code=422, detail=friendly_err)

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"SMTP email dispatch failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"SMTP Dispatch Error: {str(e)}"
        )
