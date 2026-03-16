import json
import math
import os
from dotenv import load_dotenv
import google.generativeai as genai
from models import (
    TriageRequest, TriageResponse, SeverityLevel,
    ERPrepItem, Hospital
)

load_dotenv()

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config=genai.GenerationConfig(
        temperature=0.2,          # low temp = consistent, structured output
        response_mime_type="application/json",  # force JSON mode
    ),
    system_instruction="""You are an expert emergency medical AI assistant integrated into 
a Smart Ambulance dispatch system in India. Your role is to:
1. Assess patient severity accurately using EMT/paramedic triage protocols
2. Match patients to the most appropriate hospital
3. Generate an ER preparation checklist so the hospital is ready on arrival
4. Produce a concise clinical handoff summary

You must respond ONLY with valid JSON matching the exact schema provided.
Be conservative — when in doubt, escalate severity. Lives depend on accuracy.

Severity scale:
1 - MINOR: Non-urgent, stable vitals, no immediate life threat
2 - MODERATE: Needs care within 30 min, stable but worsening possible
3 - SERIOUS: Needs care within 10 min, potential for deterioration
4 - CRITICAL: Immediate life threat, needs care in under 5 min
5 - LIFE_THREATENING: Seconds matter, activate trauma/cardiac team NOW"""
)


def build_triage_prompt(req: TriageRequest) -> str:
    vitals_str = "Not recorded"
    if req.vitals:
        parts = []
        v = req.vitals
        if v.get("hr"):      parts.append(f"HR {v['hr']} bpm")
        if v.get("spo2"):    parts.append(f"SpO2 {v['spo2']}%")
        if v.get("bp_sys"):  parts.append(f"BP {v['bp_sys']}/{v.get('bp_dia','?')} mmHg")
        if v.get("rr"):      parts.append(f"RR {v['rr']}/min")
        if v.get("temp"):    parts.append(f"Temp {v['temp']}°C")
        if v.get("gcs"):     parts.append(f"GCS {v['gcs']}/15")
        vitals_str = ", ".join(parts)

    hospitals_str = "None available"
    if req.nearby_hospitals:
        h_lines = []
        for h in req.nearby_hospitals:
            h_lines.append(
                f"- {h.name} | {h.distance_km:.1f}km | ETA {h.eta_minutes}min | "
                f"Beds: {h.available_beds} | Specialties: {', '.join(h.specialties)}"
            )
        hospitals_str = "\n".join(h_lines)

    return f"""Assess this emergency case and respond with JSON only.

PATIENT:
- Age: {req.patient_age}, Gender: {req.patient_gender}
- Symptoms: {', '.join(req.symptoms)}
- Incident type: {req.incident_type or 'Unknown'}
- Caller description: {req.caller_description or 'Not provided'}
- Vitals: {vitals_str}

NEARBY HOSPITALS:
{hospitals_str}

Respond with this exact JSON structure:
{{
  "severity": <1-5 integer>,
  "severity_label": "<MINOR|MODERATE|SERIOUS|CRITICAL|LIFE_THREATENING>",
  "confidence": <0.0-1.0>,
  "primary_impression": "<brief clinical impression>",
  "reasoning": "<2-3 sentences explaining severity decision>",
  "recommended_hospital_id": "<hospital id or null>",
  "er_prep_checklist": [
    {{
      "category": "<equipment|medication|team|imaging>",
      "action": "<specific action for ER staff>",
      "priority": "<immediate|on_arrival|standby>"
    }}
  ],
  "time_critical": <true|false>,
  "golden_hour_remaining_minutes": <integer or null>,
  "case_summary": "<2-3 sentence handoff note for receiving ER team>",
  "tags": ["<relevant clinical tags>"]
}}"""


def _haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def enrich_hospitals_with_distance(req: TriageRequest) -> TriageRequest:
    """Add distance + rough ETA to each hospital if not already set."""
    enriched = []
    for h in req.nearby_hospitals:
        dist = _haversine_km(
            req.location.lat, req.location.lng,
            h.location.lat, h.location.lng
        )
        # Assume avg city speed 25 km/h with traffic
        eta = int((dist / 25) * 60) + 3  # +3 min load/unload buffer
        enriched.append(h.model_copy(update={"distance_km": round(dist, 2), "eta_minutes": eta}))
    return req.model_copy(update={"nearby_hospitals": enriched})


async def run_triage(req: TriageRequest) -> TriageResponse:
    req = enrich_hospitals_with_distance(req)

    response = model.generate_content(build_triage_prompt(req))
    raw = response.text.strip()

    # Strip markdown code fences if present (Gemini occasionally wraps output)
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    data = json.loads(raw)

    # Resolve recommended hospital object
    recommended = None
    if data.get("recommended_hospital_id"):
        for h in req.nearby_hospitals:
            if h.id == data["recommended_hospital_id"]:
                recommended = h
                break

    checklist = [ERPrepItem(**item) for item in data.get("er_prep_checklist", [])]

    return TriageResponse(
        case_id=req.case_id,
        severity=SeverityLevel(data["severity"]),
        severity_label=data["severity_label"],
        confidence=data["confidence"],
        primary_impression=data["primary_impression"],
        reasoning=data["reasoning"],
        recommended_hospital=recommended,
        er_prep_checklist=checklist,
        time_critical=data["time_critical"],
        golden_hour_remaining_minutes=data.get("golden_hour_remaining_minutes"),
        case_summary=data["case_summary"],
        tags=data.get("tags", [])
    )
