from fastapi import APIRouter, HTTPException
from models import VitalsReading, VitalsAnalysis
from services.vitals_analysis import analyse_vitals
from services.vitals_simulator import generate_vitals_stream, get_scenario_info

router = APIRouter()

# In-memory vitals history per case (replace with Redis/TimescaleDB in production)
_vitals_history: dict[str, list[VitalsReading]] = {}


@router.post("/analyse", response_model=VitalsAnalysis)
def analyse(reading: VitalsReading):
    """
    Analyse a single vitals reading. Returns alerts, NEWS2 score, and trend.
    Called every time the ambulance tablet sends a new reading (every 3s).
    """
    history = _vitals_history.get(reading.case_id, [])
    result = analyse_vitals(reading, history)

    # Store reading in history
    history.append(reading)
    _vitals_history[reading.case_id] = history[-50:]  # keep last 50 readings

    return result


@router.get("/history/{case_id}")
def get_history(case_id: str):
    """Return full vitals history for a case (for charting on the ER screen)."""
    history = _vitals_history.get(case_id, [])
    return {"case_id": case_id, "readings": [r.model_dump() for r in history]}


@router.get("/simulate/{scenario}")
def simulate(scenario: str, case_id: str = "demo_001", steps: int = 20):
    """
    Generate a full simulated vitals stream for a demo scenario.
    Scenarios: cardiac_arrest, road_trauma, stroke, sepsis, stable
    
    Use this to seed your demo — feed these readings one-by-one via WebSocket.
    """
    try:
        readings = generate_vitals_stream(case_id=case_id, scenario=scenario, steps=steps)
        return {
            "case_id": case_id,
            "scenario": scenario,
            "total_readings": len(readings),
            "readings": [r.model_dump() for r in readings]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/scenarios")
def list_scenarios():
    """List all available demo scenarios."""
    return get_scenario_info()
