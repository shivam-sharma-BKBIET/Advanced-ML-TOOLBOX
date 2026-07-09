import csv
import json
import io
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime

from backend.database import get_db, User, PredictionLog, MessageLog

router = APIRouter(prefix="/api/history", tags=["History & Logs"])

# =============================================================================
# Helper: Query Scoping
# =============================================================================
def get_scoped_query(db: Session, model_class):
    return db.query(model_class)

# =============================================================================
# PREDICTIONS
# =============================================================================
@router.get("/predictions")
def get_predictions(
    model_name: str = Query(None, description="Filter by model name"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = get_scoped_query(db, PredictionLog)
    if model_name:
        query = query.filter(PredictionLog.model_name == model_name)
    
    total = query.count()
    logs = query.order_by(PredictionLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    results = []
    for log in logs:
        results.append({
            "id": log.id,
            "user_id": log.user_id,
            "model_name": log.model_name,
            "model_version": log.model_version,
            "input_payload": json.loads(log.input_payload) if log.input_payload else {},
            "output_value": json.loads(log.output_value) if log.output_value else {},
            "explanation": json.loads(log.explanation) if log.explanation else None,
            "created_at": log.created_at.isoformat()
        })
        
    return {"total": total, "page": page, "limit": limit, "data": results}

@router.get("/predictions/export")
def export_predictions_csv(
    model_name: str = Query(None, description="Filter by model name"),
    db: Session = Depends(get_db)
):
    query = get_scoped_query(db, PredictionLog)
    if model_name:
        query = query.filter(PredictionLog.model_name == model_name)
    logs = query.order_by(PredictionLog.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "User ID", "Model Name", "Version", "Input", "Output", "Created At"])
    for log in logs:
        writer.writerow([
            log.id, log.user_id, log.model_name, log.model_version,
            log.input_payload, log.output_value, log.created_at.isoformat()
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=predictions_export.csv"}
    )

@router.get("/predictions/export-pdf")
def export_predictions_pdf(
    model_name: str = Query(None, description="Filter by model name"),
    db: Session = Depends(get_db)
):
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
    except ImportError:
        raise HTTPException(status_code=500, detail="PDF generation library (reportlab) not installed.")

    query = get_scoped_query(db, PredictionLog)
    if model_name:
        query = query.filter(PredictionLog.model_name == model_name)
    logs = query.order_by(PredictionLog.created_at.desc()).all()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    elements.append(Paragraph(f"Prediction History Export ({model_name or 'All Models'})", styles['Title']))
    
    data = [["ID", "Model", "Version", "Created At"]]
    for log in logs:
        data.append([
            str(log.id), 
            log.model_name, 
            log.model_version or "N/A", 
            log.created_at.strftime("%Y-%m-%d %H:%M")
        ])
        
    t = Table(data, colWidths=[50, 150, 100, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.grey),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), colors.beige),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
    ]))
    elements.append(t)
    doc.build(elements)
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=predictions_export.pdf"}
    )

# =============================================================================
# MESSAGES
# =============================================================================
@router.get("/messages")
def get_messages(
    channel: str = Query(None, description="Filter by channel (whatsapp, email)"),
    status: str = Query(None, description="Filter by status (sent, failed, simulated)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = get_scoped_query(db, MessageLog)
    if channel:
        query = query.filter(MessageLog.channel == channel)
    if status:
        query = query.filter(MessageLog.status == status)
        
    total = query.count()
    logs = query.order_by(MessageLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    results = []
    for log in logs:
        rec = log.recipient

        results.append({
            "id": log.id,
            "user_id": log.user_id,
            "channel": log.channel,
            "recipient": rec,
            "message_body": log.message_body,
            "status": log.status,
            "provider_response": json.loads(log.provider_response) if log.provider_response else None,
            "created_at": log.created_at.isoformat()
        })
        
    return {"total": total, "page": page, "limit": limit, "data": results}

@router.get("/messages/export")
def export_messages_csv(
    channel: str = Query(None),
    status: str = Query(None),
    db: Session = Depends(get_db)
):
    query = get_scoped_query(db, MessageLog)
    if channel:
        query = query.filter(MessageLog.channel == channel)
    if status:
        query = query.filter(MessageLog.status == status)
    logs = query.order_by(MessageLog.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "User ID", "Channel", "Recipient", "Status", "Created At"])
    for log in logs:
        rec = log.recipient

        
        writer.writerow([
            log.id, log.user_id, log.channel, rec, log.status, log.created_at.isoformat()
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=messages_export.csv"}
    )
