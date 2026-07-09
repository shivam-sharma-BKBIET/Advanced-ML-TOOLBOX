# ML Toolbox Deployment Guide

This guide details how to deploy the **ML Toolbox** platform using Docker and Docker Compose. This production-ready setup orchestrates the frontend (Vite/React via Nginx) and the backend (FastAPI via Uvicorn/ASGI) with persistent SQLite databases and trained model registries.

## Prerequisites
- **Docker** installed (`v24.0+` recommended)
- **Docker Compose** installed (`v2.20+` recommended)
- Appropriate API keys for external services (Gemini, Twilio, SMTP)

## Step 1: Environment Configuration

Before starting the containers, configure your environment variables.

1. Navigate to the `backend/` directory.
2. If you don't already have one, copy `.env.example` to `.env`.
   ```bash
   cd backend
   cp .env.example .env
   ```
3. Open the `.env` file and ensure the following keys are populated:
   - `JWT_SECRET` (A strong, secure string for signing tokens)
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`
   - `GEMINI_API_KEY`

> [!NOTE]
> In production via Docker, the `DATABASE_URL`, `MODEL_DIR`, and `ENVIRONMENT` variables are automatically injected via the `docker-compose.yml` file. You do not need to set them in `.env`.

## Step 2: Build and Run with Docker Compose

From the root directory of the project (where `docker-compose.yml` is located), run:

```bash
docker-compose up --build -d
```

This command will:
1. Build the **Backend image** (installs heavy PyTorch/scikit-learn dependencies).
2. Build the **Frontend image** (runs `npm run build` and places the output in Nginx).
3. Start the containers in the background (`-d` flag).
4. Create persistent volumes:
   - `sqlite_data` for the database.
   - `model_registry` for versioned ML models.

## Step 3: Verification

Once the containers are running, you can verify the deployment:

1. **Frontend Access**: Open your browser and navigate to `http://localhost:8080`. You should see the ML Toolbox login screen.
2. **Backend Health Check**: Navigate to `http://localhost:8000/api/health` to confirm the backend API is online and reports a "healthy" status.
3. **Database Seed**: On the first startup, Uvicorn will automatically create the required database tables inside the mounted SQLite volume and seed fallback models into the registry.

## Step 4: Shutting Down & Data Persistence

To stop the application:

```bash
docker-compose down
```

> [!TIP]
> **Your data is safe!** Because we mapped the database and model registry to Docker Volumes (`sqlite_data` and `model_registry`), running `docker-compose down` will **not** delete your users, history, or trained ML models. They will be exactly where you left them the next time you run `docker-compose up -d`.

---

## Known Limitations & Future Upgrades

- **Database**: This setup currently utilizes **SQLite** stored via a Docker Volume. While perfectly fine for small teams, SQLite can encounter "Database Locked" errors under high concurrency. For enterprise scale, we recommend upgrading to a **PostgreSQL** container in your `docker-compose.yml` and updating the `DATABASE_URL` appropriately.
- **Workers**: The backend is configured to use `4` Uvicorn workers. If deploying to a server with limited CPU, you may need to adjust the `--workers` flag in `backend/Dockerfile`.
