# Multi-Utility Automation & Machine Learning Dashboard

A premium, production-ready SaaS platform that orchestrates a **FastAPI** backend and a **Vite/React** frontend using Nginx. The platform features interactive machine learning workflows, a PyTorch deep learning sequence generation simulator, sandboxed and live communication channels, automated feature engineering, and robust model monitoring capabilities.

---

## Key Features

### 1. Machine Learning & Interpretability
*   **Predictors**: Salary Predictor (Gradient Boosting Regressor) and Laptop Price Predictor.
*   **SHAP-Based Prediction Explainability**: Real-time per-feature contribution breakdown shown after every salary/laptop prediction. Uses a cached `TreeExplainer` keyed by model version to avoid CPU bottlenecks on repetitive requests.
*   **Batch Prediction**: CSV upload for bulk predictions with asynchronous background processing for large files, SHAP explanation computed on top candidates, and clean CSV export.
*   **Model Registry**: Read-only tracking showing active versions, training epochs, final loss/scores, and metric parameters for `salary`, `laptop`, and `mini_llm` models.

### 2. Deep Learning Simulator (PyTorch MiniLLM)
*   **Token Generation**: Interactive, step-by-step sequence generation trace simulating token generation with a custom vocabulary.
*   **Architecture Toggling**: Switch dynamically between a 2-layer LSTM and a minimal Transformer architecture with checkpointing support.
*   **Text Sampling Control**: Adjust temperature and top-k parameters to explore deterministic vs. diverse/creative outputs.

### 3. Data Studio & Cleaning
*   **Multi-Format Upload**: Upload datasets in CSV, Excel (XLSX), or JSON formats.
*   **Data Quality Scoring**: Real-time quality reports evaluating completeness, uniqueness, consistency, and outliers.
*   **Duplicate Detection**: Computes exact duplicate and near-duplicate counts.
*   **Class Imbalance Detection**: Highlights skewed distributions in classification targets.
*   **Automated Feature Engineering**: Apply offline transformations such as datetime extraction (year, month, day, day of week), ratio calculations, and quantile/equal-width binning.

### 4. Automation & Telephony Studio
*   **Hybrid Architecture**: Switch between simulated sandbox mode (100% free) and live production mode.
*   **Channels**:
    *   **WhatsApp Messages**: Dispatched via Twilio WhatsApp API.
    *   **Email Messages**: Sent via SMTP (with TLS).
*   **Developer Diagnostics & Guides**: Detailed diagnostics and setup instructions for App Passwords and Twilio Sandboxes.
*   **Interactive Simulation Suite**: Real-time smartphone and mailbox previewers.

### 5. Observability Hub & UX Enhancements
*   **Global Analytics Hub**: Live telemetry counters tracking total predictions, batch jobs, message dispatches, and datasets processed.
*   **System Health**: Uptime tracking, database connectivity checks, and active model status.
*   **Data Drift Monitoring**: Computes Population Stability Index (PSI) to detect moderate/significant feature drift in live inputs compared to training baselines.
*   **Interactive Onboarding**: Step-by-step user onboarding tour powered by React Joyride to walk new visitors through dashboard modules.
*   **Built-in Samples**: Direct download links for sample datasets (salary, laptop, messy data, and batch prediction demos) across modules.

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
