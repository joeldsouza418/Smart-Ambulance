import random
import time
import math
from models import VitalsReading

# Pre-built demo scenarios with realistic vital progressions
SCENARIOS = {
    "cardiac_arrest": {
        "label": "STEMI / Cardiac Arrest",
        "base": {"hr": 110, "spo2": 91, "bp_sys": 88, "bp_dia": 60, "rr": 22, "temp": 36.8, "gcs": 12},
        "drift": {"hr": +2, "spo2": -0.5, "bp_sys": -1.5, "rr": +0.5, "gcs": -0.2}
    },
    "road_trauma": {
        "label": "Road Traffic Accident / Polytrauma",
        "base": {"hr": 122, "spo2": 94, "bp_sys": 96, "bp_dia": 65, "rr": 26, "temp": 36.2, "gcs": 11},
        "drift": {"hr": +1.5, "spo2": -0.3, "bp_sys": -2, "rr": +0.3, "gcs": -0.1}
    },
    "stroke": {
        "label": "Ischaemic Stroke",
        "base": {"hr": 88, "spo2": 95, "bp_sys": 185, "bp_dia": 110, "rr": 18, "temp": 37.2, "gcs": 10},
        "drift": {"hr": +0.5, "spo2": -0.2, "bp_sys": +1, "rr": +0.2, "gcs": -0.3}
    },
    "sepsis": {
        "label": "Septic Shock",
        "base": {"hr": 118, "spo2": 92, "bp_sys": 85, "bp_dia": 55, "rr": 24, "temp": 39.8, "gcs": 13},
        "drift": {"hr": +1, "spo2": -0.4, "bp_sys": -1, "rr": +0.3, "gcs": -0.1}
    },
    "stable": {
        "label": "Minor Injury (Stable)",
        "base": {"hr": 82, "spo2": 98, "bp_sys": 120, "bp_dia": 78, "rr": 16, "temp": 36.9, "gcs": 15},
        "drift": {"hr": 0, "spo2": 0, "bp_sys": 0, "rr": 0, "gcs": 0}
    }
}


def _add_noise(value: float, pct: float = 0.03) -> float:
    """Add ±pct% physiological noise to simulate real sensor readings."""
    noise = value * pct * (random.random() * 2 - 1)
    return round(value + noise, 1)


def _add_waveform(value: float, t: float, amplitude: float, freq: float) -> float:
    """Add a subtle sinusoidal oscillation (simulates breathing/cardiac cycles)."""
    return round(value + amplitude * math.sin(2 * math.pi * freq * t), 1)


def generate_vitals_stream(
    case_id: str,
    scenario: str = "cardiac_arrest",
    steps: int = 20,
    interval_seconds: float = 3.0
) -> list[VitalsReading]:
    """
    Generate a list of VitalsReading objects simulating a patient en route.
    In production, replace with real IoT/device stream via WebSocket.
    """
    if scenario not in SCENARIOS:
        raise ValueError(f"Unknown scenario '{scenario}'. Choose from: {list(SCENARIOS.keys())}")

    cfg = SCENARIOS[scenario]
    current = dict(cfg["base"])
    drift = cfg["drift"]
    readings = []
    now = time.time()

    for i in range(steps):
        t = now + i * interval_seconds

        # Apply drift (gradual deterioration/improvement)
        for key in drift:
            if key in current:
                current[key] += drift[key]

        # Clamp to physiological limits
        current["hr"]     = max(20,  min(220, current["hr"]))
        current["spo2"]   = max(60,  min(100, current["spo2"]))
        current["bp_sys"] = max(50,  min(240, current["bp_sys"]))
        current["bp_dia"] = max(30,  min(150, current["bp_dia"]))
        current["rr"]     = max(4,   min(40,  current["rr"]))
        current["temp"]   = max(32,  min(42,  current["temp"]))
        current["gcs"]    = max(3,   min(15,  int(current["gcs"])))

        readings.append(VitalsReading(
            case_id=case_id,
            timestamp=t,
            hr=_add_noise(_add_waveform(current["hr"], i, 3, 0.1)),
            spo2=_add_noise(current["spo2"], pct=0.005),
            bp_sys=_add_noise(current["bp_sys"], pct=0.04),
            bp_dia=_add_noise(current["bp_dia"], pct=0.04),
            rr=_add_noise(current["rr"], pct=0.05),
            temp=_add_noise(current["temp"], pct=0.005),
            gcs=int(current["gcs"])
        ))

    return readings


def get_scenario_info() -> dict:
    return {k: v["label"] for k, v in SCENARIOS.items()}
