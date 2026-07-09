# Multi-Utility Automation & Machine Learning Dashboard

A production-ready SaaS platform that orchestrates a **FastAPI** backend and a **Vite/React** frontend using Nginx, featuring interactive machine learning workflows, a PyTorch deep learning simulator, automation templates, and data analytics tools.

---

## Architecture & Features

- **Machine Learning Predictors**: Real-time salary predictor, resume parser, electricity forecaster, laptop pricing model, and sentiment analyzer.
- **Deep Learning Simulator**: Interactive token-by-token sequence generation using a custom 2-layer LSTM MiniLLM.
- **Automation & Telephony Studio**: Sandboxed and production email (SMTP) and WhatsApp/SMS (Twilio) messaging flows.
- **Data Studio**: Interactive dataset upload with offline missing value imputation and one-hot encoding feature weight analysis.
- **Observability Hub**: Live telemetry, data drift detection, prediction history, and system health status.

---

## Design Decision

Model training is intentionally **CLI-only** (`python -m backend.scripts.train_models`) rather than triggered from the running app — this keeps the public-facing app stable, fast, and safe from abuse, while still allowing full retraining when needed.

---

## Getting Started

### Local Development

#### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Activate the virtual environment:
# On Windows (Command Prompt):
venv\Scripts\activate
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m backend.scripts.train_models   # one-time: generate initial models
uvicorn main:app --reload
```

The backend server will start at `http://localhost:8000`. You can access the auto-generated API docs at `http://localhost:8000/docs`.

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend development server will start at `http://localhost:5173`.

---

### Docker Deployment

To spin up the entire containerized stack (Frontend Nginx container + FastAPI backend container + persistent volume mounts):

```bash
docker-compose up --build
```

- Open `http://localhost:8080` to access the application.
- See `DEPLOYMENT.md` for full deployment and container architecture details.

---

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your values:

- `GEMINI_API_KEY` — free tier key from [Google AI Studio](https://aistudio.google.com)
- **Twilio Credentials** (optional, for WhatsApp/SMS sandbox)
- **SMTP Credentials** (optional, for email dispatch)

---

## Testing

Ensure your virtual environment is active, then run the test suite:

```bash
python -m pytest backend/tests/
```

---

## Notes

- **Public Demo App**: This is a public demo app with no authentication — all data (predictions, chat logs, messages) is globally visible, and sensitive endpoints are protected via IP-based rate limiting instead of accounts.
- **Artifacts Exclusion**: Model weights and the SQLite database are excluded from version control; run `train_models.py` after cloning to generate working models locally.
