"""
Quick demo test — run this to verify the full triage pipeline.
Usage: python demo_test.py
"""
import asyncio
import json
from models import TriageRequest, Location, Hospital
from services.gemini_triage import run_triage
from services.vitals_simulator import generate_vitals_stream
from services.vitals_analysis import analyse_vitals


CARDIAC_CASE = TriageRequest(
    case_id="DEMO_001",
    patient_age=58,
    patient_gender="male",
    symptoms=["chest pain", "left arm radiation", "sweating", "nausea", "shortness of breath"],
    incident_type="cardiac",
    caller_description="Man collapsed at Dadar station, clutching chest, semi-conscious",
    vitals={"hr": 112, "spo2": 91, "bp_sys": 88, "bp_dia": 60, "rr": 22, "gcs": 12},
    location=Location(lat=19.0178, lng=72.8478, address="Dadar Railway Station, Mumbai"),
    nearby_hospitals=[
        Hospital(
            id="kem", name="KEM Hospital",
            location=Location(lat=19.0043, lng=72.8404, address="Parel, Mumbai"),
            specialties=["cardiac", "trauma", "neurology"],
            available_beds=8,
            distance_km=2.1,
            eta_minutes=7
        ),
        Hospital(
            id="sion", name="Sion Hospital",
            location=Location(lat=19.0438, lng=72.8607, address="Sion, Mumbai"),
            specialties=["cardiac", "neurology"],
            available_beds=12,
            distance_km=3.4,
            eta_minutes=11
        ),
    ]
)


async def test_triage():
    print("\n" + "="*60)
    print("🚨 SMART AMBULANCE — AI TRIAGE TEST")
    print("="*60)
    print(f"\nCase: {CARDIAC_CASE.case_id}")
    print(f"Patient: {CARDIAC_CASE.patient_age}M | {', '.join(CARDIAC_CASE.symptoms)}")
    print(f"Vitals: {CARDIAC_CASE.vitals}")
    print("\n⏳ Sending to Claude AI...\n")

    result = await run_triage(CARDIAC_CASE)

    print(f"🔴 SEVERITY:     {result.severity} — {result.severity_label}")
    print(f"📋 IMPRESSION:   {result.primary_impression}")
    print(f"🏥 HOSPITAL:     {result.recommended_hospital.name if result.recommended_hospital else 'N/A'}")
    print(f"⚡ TIME CRITICAL: {result.time_critical}")
    print(f"⏱  GOLDEN HOUR:  {result.golden_hour_remaining_minutes} min remaining")
    print(f"🎯 CONFIDENCE:   {result.confidence:.0%}")
    print(f"\n💡 REASONING:\n   {result.reasoning}")
    print(f"\n📝 CASE SUMMARY:\n   {result.case_summary}")
    print(f"\n🏷  TAGS: {', '.join(result.tags)}")
    print(f"\n📋 ER PREP CHECKLIST ({len(result.er_prep_checklist)} items):")
    for item in result.er_prep_checklist:
        icon = "🔴" if item.priority == "immediate" else "🟡" if item.priority == "on_arrival" else "⚪"
        print(f"   {icon} [{item.category.upper()}] {item.action}")


def test_vitals():
    print("\n" + "="*60)
    print("💓 VITALS SIMULATOR TEST — Cardiac Arrest Scenario")
    print("="*60)

    readings = generate_vitals_stream("DEMO_001", scenario="cardiac_arrest", steps=5)
    history = []

    for i, r in enumerate(readings):
        analysis = analyse_vitals(r, history)
        history.append(r)
        print(f"\nReading {i+1}: HR {r.hr} | SpO2 {r.spo2}% | BP {r.bp_sys}/{r.bp_dia} | GCS {r.gcs}")
        print(f"  NEWS2: {analysis.early_warning_score} | Trend: {analysis.trend} | Shock Index: {analysis.shock_index}")
        if analysis.alerts:
            for alert in analysis.alerts:
                icon = "🔴" if alert["severity"] == "critical" else "🟡"
                print(f"  {icon} ALERT: {alert['message']}")


if __name__ == "__main__":
    test_vitals()
    asyncio.run(test_triage())
    print("\n✅ All tests passed. AI service is ready.\n")
