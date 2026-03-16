from models import VitalsReading, VitalsAnalysis
from typing import Optional


# NEWS2 scoring tables (UK Royal College of Physicians standard)
def _score_hr(hr: float) -> int:
    if hr <= 40 or hr >= 131: return 3
    if hr <= 50 or hr >= 111: return 1
    if hr >= 91: return 1 if hr <= 110 else 2
    return 0

def _score_spo2(spo2: float) -> int:
    if spo2 <= 91: return 3
    if spo2 <= 93: return 2
    if spo2 <= 95: return 1
    return 0

def _score_rr(rr: float) -> int:
    if rr <= 8 or rr >= 25: return 3
    if rr <= 11: return 1
    if rr >= 21: return 2
    return 0

def _score_bp_sys(bp: float) -> int:
    if bp <= 90 or bp >= 220: return 3
    if bp <= 100: return 2
    if bp <= 110: return 1
    return 0

def _score_temp(temp: float) -> int:
    if temp <= 35.0: return 3
    if temp <= 36.0: return 1
    if temp >= 39.1: return 2
    if temp >= 38.1: return 1
    return 0

def _score_gcs(gcs: int) -> int:
    if gcs <= 8: return 3
    if gcs <= 12: return 2
    if gcs <= 14: return 1
    return 0


ALERT_RULES = [
    # (parameter, condition_fn, message, severity)
    ("hr",     lambda v: v > 130,   "Tachycardia: HR > 130 bpm — possible arrhythmia or haemorrhage",   "critical"),
    ("hr",     lambda v: v < 40,    "Severe bradycardia: HR < 40 bpm — risk of cardiac arrest",          "critical"),
    ("hr",     lambda v: 100 < v <= 130, "Tachycardia: HR > 100 bpm",                                   "warning"),
    ("spo2",   lambda v: v < 90,    "Critical hypoxia: SpO2 < 90% — immediate O2 and airway support",    "critical"),
    ("spo2",   lambda v: 90 <= v < 94, "Hypoxia: SpO2 < 94% — supplemental O2 required",               "warning"),
    ("bp_sys", lambda v: v < 90,    "Hypotension: SBP < 90 mmHg — possible shock",                      "critical"),
    ("bp_sys", lambda v: v > 180,   "Hypertensive crisis: SBP > 180 mmHg",                              "warning"),
    ("rr",     lambda v: v > 30,    "Severe tachypnoea: RR > 30 — respiratory failure risk",             "critical"),
    ("rr",     lambda v: v < 8,     "Bradypnoea: RR < 8 — airway compromise risk",                      "critical"),
    ("temp",   lambda v: v > 39.5,  "High fever: Temp > 39.5°C — possible sepsis",                      "warning"),
    ("temp",   lambda v: v < 35.0,  "Hypothermia: Temp < 35°C",                                         "warning"),
    ("gcs",    lambda v: v <= 8,    "Severe GCS ≤ 8 — protect airway, consider intubation",             "critical"),
    ("gcs",    lambda v: 9 <= v <= 12, "Reduced consciousness: GCS 9–12",                               "warning"),
]


def compute_shock_index(hr: Optional[float], bp_sys: Optional[float]) -> Optional[float]:
    """Shock Index = HR / SBP. >1.0 suggests significant haemorrhage/shock."""
    if hr and bp_sys and bp_sys > 0:
        return round(hr / bp_sys, 2)
    return None


def compute_news2(v: VitalsReading) -> int:
    score = 0
    if v.rr:     score += _score_rr(v.rr)
    if v.spo2:   score += _score_spo2(v.spo2)
    if v.bp_sys: score += _score_bp_sys(v.bp_sys)
    if v.hr:     score += _score_hr(v.hr)
    if v.temp:   score += _score_temp(v.temp)
    if v.gcs:    score += _score_gcs(v.gcs)
    return score


def analyse_trend(history: list[VitalsReading]) -> str:
    """Compare latest two readings to determine clinical trend."""
    if len(history) < 2:
        return "stable"
    prev, curr = history[-2], history[-1]
    prev_score = compute_news2(prev)
    curr_score = compute_news2(curr)
    if curr_score > prev_score:        # any increase = deteriorating
        return "deteriorating"
    if curr_score < prev_score:        # any decrease = improving
        return "improving"
    return "stable"


def analyse_vitals(reading: VitalsReading, history: list[VitalsReading] = None) -> VitalsAnalysis:
    alerts = []
    for param, condition, message, severity in ALERT_RULES:
        value = getattr(reading, param, None)
        if value is not None and condition(value):
            alerts.append({
                "parameter": param,
                "value": value,
                "message": message,
                "severity": severity
            })
            break  # one alert per parameter (highest priority already first)

    shock_index = compute_shock_index(reading.hr, reading.bp_sys)
    if shock_index and shock_index > 1.0:
        alerts.append({
            "parameter": "shock_index",
            "value": shock_index,
            "message": f"Shock Index {shock_index} > 1.0 — haemorrhagic shock possible",
            "severity": "critical" if shock_index > 1.4 else "warning"
        })

    news2 = compute_news2(reading)
    trend = analyse_trend((history or []) + [reading])

    return VitalsAnalysis(
        case_id=reading.case_id,
        alerts=alerts,
        trend=trend,
        shock_index=shock_index,
        early_warning_score=news2
    )
