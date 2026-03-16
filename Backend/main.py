from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import triage, vitals, hospitals
from dotenv import load_dotenv
import uvicorn

load_dotenv()  # loads GEMINI_API_KEY from .env

app = FastAPI(
    title="Smart Ambulance - AI Service",
    description="Claude-powered triage, vitals analysis, and hospital matching",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(triage.router, prefix="/api/triage", tags=["Triage"])
app.include_router(vitals.router, prefix="/api/vitals", tags=["Vitals"])
app.include_router(hospitals.router, prefix="/api/hospitals", tags=["Hospitals"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "AI Emergency Response"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
