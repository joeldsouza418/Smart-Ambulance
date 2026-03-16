# Smart Ambulance — AI Service (Member 2)

FastAPI + Google Gemini 1.5 Flash backend for triage, vitals analysis, and hospital matching.

## Setup

```bash
cd ai_service
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file:
```
GEMINI_API_KEY=your_key_here
```

Get your free API key at: https://aistudio.google.com/app/apikey

## Run

```bash
uvicorn main:app --reload --port 8000
```

API docs auto-generated at: http://localhost:8000/docs

## Test the pipeline

```bash
python demo_test.py
```

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/triage/assess` | Full AI triage — severity + hospital + ER checklist |
| POST | `/api/triage/quick` | Fast severity-only triage |
| POST | `/api/vitals/analyse` | Analyse one vitals reading (NEWS2 + alerts) |
| GET  | `/api/vitals/simulate/{scenario}` | Generate demo vitals stream |
| GET  | `/api/vitals/history/{case_id}` | Full vitals history for charting |
| GET  | `/api/hospitals/nearby/list?lat=&lng=` | Hospitals near a location |

## Demo Scenarios

- `cardiac_arrest` — STEMI, deteriorating vitals
- `road_trauma` — Polytrauma, haemorrhage
- `stroke` — Hypertensive, reduced GCS
- `sepsis` — Fever, hypotension
- `stable` — Minor injury, normal vitals

## Integration with Web Member (Member 1)

Share this event contract. Member 1's Socket.IO server emits:
```json
{ "event": "new_emergency", "case_id": "...", "symptoms": [], "location": {...} }
```

Member 2's service responds via REST POST to `/api/triage/assess`.
Result flows back to dispatch dashboard and hospital ER screen.

Agree on this JSON schema before Hour 4.
