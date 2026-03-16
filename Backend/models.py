from pydantic import BaseModel, Field
from typing import Optional
from enum import IntEnum


class SeverityLevel(IntEnum):
    MINOR = 1
    MODERATE = 2
    SERIOUS = 3
    CRITICAL = 4
    LIFE_THREATENING = 5


class Location(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None


class Hospital(BaseModel):
    id: str
    name: str
    location: Location
    specialties: list[str]
    available_beds: int
    distance_km: Optional[float] = None
    eta_minutes: Optional[int] = None


class TriageRequest(BaseModel):
    case_id: str
    patient_age: int
    patient_gender: str = "unknown"
    symptoms: list[str] = Field(..., min_length=1)
    vitals: Optional[dict] = None        # { hr, spo2, bp_sys, bp_dia, rr, temp }
    incident_type: Optional[str] = None  # "cardiac", "trauma", "stroke", etc.
    caller_description: Optional[str] = None
    location: Location
    nearby_hospitals: list[Hospital] = []


class ERPrepItem(BaseModel):
    category: str       # "equipment", "medication", "team", "imaging"
    action: str
    priority: str       # "immediate", "on_arrival", "standby"


class TriageResponse(BaseModel):
    case_id: str
    severity: SeverityLevel
    severity_label: str
    confidence: float           # 0.0 – 1.0
    primary_impression: str     # e.g. "Suspected STEMI"
    reasoning: str
    recommended_hospital: Optional[Hospital] = None
    er_prep_checklist: list[ERPrepItem] = []
    time_critical: bool
    golden_hour_remaining_minutes: Optional[int] = None
    case_summary: str           # 2–3 sentence handoff note for ER team
    tags: list[str] = []        # ["cardiac", "airway_risk", "hemorrhage"]


class VitalsReading(BaseModel):
    case_id: str
    timestamp: float
    hr: Optional[float] = None        # Heart rate bpm
    spo2: Optional[float] = None      # Oxygen saturation %
    bp_sys: Optional[float] = None    # Systolic mmHg
    bp_dia: Optional[float] = None    # Diastolic mmHg
    rr: Optional[float] = None        # Respiratory rate /min
    temp: Optional[float] = None      # Temperature °C
    gcs: Optional[int] = None         # Glasgow Coma Scale 3–15


class VitalsAnalysis(BaseModel):
    case_id: str
    alerts: list[dict]          # [{ "parameter": "spo2", "value": 88, "message": "...", "severity": "critical" }]
    trend: str                  # "stable", "deteriorating", "improving"
    shock_index: Optional[float] = None
    early_warning_score: int    # NEWS2 score 0–20
