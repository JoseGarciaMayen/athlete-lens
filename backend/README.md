# Backend

FastAPI backend for Athlete Lens. Handles video analysis, data persistence, and the REST API consumed by the frontend.

---

## Architecture

```
backend/
├── api/
│   ├── main.py              # FastAPI app, lifespan handler, CORS
│   └── routes/
│       ├── vertical.py      # POST /api/analyze/vertical
│       ├── sprint.py        # POST /api/analyze/sprint
│       ├── horizontal.py    # POST /api/analyze/horizontal
│       └── sessions.py      # athlete profile, sessions, dashboard, metrics
├── core/
│   ├── vertical/
│   │   └── extractor.py     # YOLOv8 ankle tracking pipeline
│   └── sprint/
│       └── extractor.py     # YOLOv8 hip crossing detection pipeline
├── db/
│   ├── models.py            # SQLAlchemy models
│   ├── crud.py              # database helpers
│   └── database.py          # engine, session factory, get_db dependency
└── tests/
```

**Request flow:** `route → core/extractor.py → db/crud.py`

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/api/athlete` | Get athlete profile |
| `PUT` | `/api/athlete` | Update athlete profile (name, weight, height) |
| `GET` | `/api/sessions` | List all sessions |
| `POST` | `/api/sessions` | Create a session |
| `GET` | `/api/dashboard` | Best metric per session (for charts) |
| `GET` | `/api/metrics` | All metrics, sorted by date desc |
| `DELETE` | `/api/metrics/vertical/{id}` | Delete a vertical metric |
| `DELETE` | `/api/metrics/horizontal/{id}` | Delete a horizontal metric |
| `DELETE` | `/api/metrics/sprint/{id}` | Delete a sprint metric |
| `POST` | `/api/analyze/vertical` | Analyse vertical jump video |
| `POST` | `/api/analyze/sprint` | Analyse sprint video |
| `POST` | `/api/analyze/horizontal` | Save horizontal jump (manual entry) |

All video endpoints accept `multipart/form-data`. They also accept a manual value (`jump_height_cm` / `sprint_time_s`) to skip video processing.

---

## Key design decisions

### YOLOv8 instead of MediaPipe

The original design used MediaPipe. MediaPipe 0.10.x dropped the `mp.solutions` API entirely, and the last version that supported it (`0.10.14`) has no wheels for Python 3.12+. Switched to `ultralytics` (YOLOv8n-pose), which supports modern Python and is actively maintained.

### GPU auto-detection

At startup `lifespan` checks `torch.cuda.is_available()` and stores the result in `app.state.device`. Both extractors receive `device` as a parameter. CPU fallback processes a typical video in ~10 s, which is acceptable for personal-use frequency.

### Synchronous endpoints

Routes are defined as `def`, not `async def`. Video analysis is CPU-bound and blocking. `async def` would block the event loop just as much without any benefit; `def` lets FastAPI run the handler in a thread pool, which is the correct pattern for synchronous I/O-heavy work.

### Model loaded once at startup

`app.state.model = YOLO("yolov8n-pose.pt")` in the `lifespan` handler. Loading YOLOv8 takes ~1–2 s; doing it per-request would be unacceptable. The same `app.state.device` string is also set there and passed to every analysis call.

### `{success, error}` error contract

All functions in `core/*/extractor.py` return dicts: `{"success": True, ...data}` or `{"success": False, "error": "..."}`. Python exceptions would be more idiomatic, but this pattern was established early and kept consistent across all modules.

### SQLite or PostgreSQL, no migrations

Single-user app. SQLite works out of the box for local use with no server required. PostgreSQL (e.g. Supabase) can be used for remote persistence by setting `DATABASE_URL` in the environment. Schema changes are handled by dropping and recreating the database with a manual backup. Alembic would add complexity not justified by the use case.

### No authentication

Single-user, local installation. If exposed via Cloudflare Tunnel, access can be restricted at the network layer (Cloudflare Access / Zero Trust) without touching the application code.

### FPS is not trusted: timestamps are used instead

`MediaRecorder` produces WebM video with unreliable FPS metadata (often `1000`, `0`, or a value that disagrees with the actual frame cadence). Both extractors ignore the FPS header and instead read `cv2.CAP_PROP_POS_MSEC` before each `cap.read()` to collect the real timestamp of every frame as stored in the WebM container.

For vertical jump, flight time is `timestamps_ms[landing_frame] - timestamps_ms[takeoff_frame]`. For sprint, sprint time is the timestamp of the crossing frame directly. Neither calculation divides by FPS at any point.

The `fps` form field is still accepted by both endpoints as a fallback, but is only used if timestamp extraction fails entirely.

### `distance_m` stored per metric, not per session

`SprintMetric.distance_m` lives on the metric row, not on the session. This allows multiple sprint distances in the same session. The `/api/dashboard` endpoint groups separately by distance.

### `get_or_create_session` by `(athlete_id, date)`

Submitting multiple metrics on the same day reuses the same session row. Session notes are set by the first metric of the day; subsequent submissions on the same date ignore the `notes` field.

---

## Development setup

```bash
cd backend
uv sync
uv run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### Running tests

```bash
uv run pytest -m "not integration"   # fast, no fixtures needed
uv run pytest                         # all tests (requires video fixtures)
```

→ [Test documentation](tests/README.md)
