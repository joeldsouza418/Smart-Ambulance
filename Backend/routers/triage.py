from fastapi import APIRouter, HTTPException
from models import TriageRequest, TriageResponse
from services.gemini_triage import run_triage
import json

router = APIRouter()


@router.post("/assess", response_model=TriageResponse)
async def assess_patient(req: TriageRequest):
    """
    Main triage endpoint. Send patient data, receive AI severity assessment,
    hospital recommendation, and ER prep checklist.
    
    Called by: Web member's dispatch service immediately after emergency intake.
    """
    try:
        result = await run_triage(req)
        return result
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Claude returned malformed JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quick", response_model=dict)
async def quick_triage(symptoms: list[str], age: int, incident_type: str = "unknown"):
    """
    Lightweight triage for pre-screening — no hospital matching.
    Returns just severity + primary impression. Fast path for dispatch.
    """
    from models import Location
    req = TriageRequest(
        case_id="quick",
        patient_age=age,
        symptoms=symptoms,
        incident_type=incident_type,
        location=Location(lat=0, lng=0)
    )
    try:
        result = await run_triage(req)
        return {
            "severity": result.severity,
            "severity_label": result.severity_label,
            "primary_impression": result.primary_impression,
            "time_critical": result.time_critical,
            "tags": result.tags
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
