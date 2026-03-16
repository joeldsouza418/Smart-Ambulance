from fastapi import APIRouter
from models import Hospital, Location

router = APIRouter()

# Seed hospital data — Mumbai. Replace with DB query in production.
HOSPITALS_DB = [
    Hospital(
        id="kem",
        name="KEM Hospital",
        location=Location(lat=19.0043, lng=72.8404, address="Acharya Donde Marg, Parel, Mumbai"),
        specialties=["cardiac", "trauma", "neurology", "burns"],
        available_beds=8
    ),
    Hospital(
        id="nair",
        name="Nair Hospital",
        location=Location(lat=18.9647, lng=72.8258, address="Dr. A.L. Nair Road, Mumbai Central"),
        specialties=["trauma", "orthopaedics", "general_surgery"],
        available_beds=5
    ),
    Hospital(
        id="sion",
        name="Sion Hospital",
        location=Location(lat=19.0438, lng=72.8607, address="Dr. Ambedkar Road, Sion, Mumbai"),
        specialties=["cardiac", "neurology", "paediatrics"],
        available_beds=12
    ),
    Hospital(
        id="hinduja",
        name="Hinduja Hospital",
        location=Location(lat=19.0510, lng=72.8456, address="Veer Savarkar Marg, Mahim, Mumbai"),
        specialties=["cardiac", "neurology", "oncology", "transplant"],
        available_beds=3
    ),
    Hospital(
        id="lilavati",
        name="Lilavati Hospital",
        location=Location(lat=19.0494, lng=72.8272, address="A-791, Bandra Reclamation, Bandra West"),
        specialties=["cardiac", "neurology", "trauma", "icu"],
        available_beds=6
    ),
]


@router.get("/", response_model=list[Hospital])
def list_hospitals():
    """Return all hospitals. Web member uses this to populate the dispatch map."""
    return HOSPITALS_DB


@router.get("/{hospital_id}", response_model=Hospital)
def get_hospital(hospital_id: str):
    for h in HOSPITALS_DB:
        if h.id == hospital_id:
            return h
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Hospital not found")


@router.get("/nearby/list")
def nearby_hospitals(lat: float, lng: float, radius_km: float = 15.0):
    """
    Return hospitals within radius_km of a coordinate.
    Used by triage service to build the hospital selection list.
    """
    import math

    def dist(h: Hospital) -> float:
        dlat = math.radians(h.location.lat - lat)
        dlng = math.radians(h.location.lng - lng)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat)) * math.cos(math.radians(h.location.lat)) * math.sin(dlng/2)**2
        return 6371 * 2 * math.asin(math.sqrt(a))

    nearby = [h for h in HOSPITALS_DB if dist(h) <= radius_km]
    nearby.sort(key=dist)
    return nearby
