# Frontend

React + Vite frontend for Athlete Lens. Provides the Upload, Dashboard, and History interfaces and communicates with the FastAPI backend via `fetch`.

---

## Stack

| | |
|---|---|
| Framework | React 19 |
| Build tool | Vite |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Routing | React Router v7 |
| PWA | Service Worker + Web App Manifest |

---

## Environment variables

Copy `.env.example` to `.env` before running:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend base URL | `http://localhost:8000` |
| `FRONTEND_URL` | Public frontend URL (used by backend CORS) | `http://localhost:5173` |
| `VITE_ALLOWED_HOST` | Vite dev server allowed host (for Cloudflare Tunnel) | _(empty)_ |

`.env` is gitignored. `.env.example` is committed with safe defaults.

---

## Development

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

The backend must be running at `VITE_API_URL` (default: `http://localhost:8000`).

---

## Pages

### Dashboard (`/dashboard`)

Fetches `GET /api/dashboard` and renders one `LineChart` per metric type (vertical jump, horizontal jump, 30 m sprint, 60 m sprint). Each chart shows the best value per session date. Empty charts render a placeholder instead of crashing.

### Upload (`/upload`)

Three tabs: Vertical Jump, Horizontal Jump, Sprint. Each tab is an independent component.

### History (`/history`)

Fetches `GET /api/metrics` and displays a paginated table (15 rows per page). The "Export CSV" button downloads all metrics (not just the current page). Delete buttons call `DELETE /api/metrics/{type}/{id}` and update the list in-place without re-fetching.

---

## Components

### `UploadVertical`

1. **Camera recording:** countdown (configurable 5–15 s) → beep → timed recording (configurable 5–10 s) → auto-stop → upload.
2. **Manual entry:** enter jump height in cm directly.

Sends `multipart/form-data` to `POST /api/analyze/vertical` with `session_date`, `file` (WebM blob), and `fps` (read from `videoTrack.getSettings().frameRate` to work around invalid FPS metadata in WebM).

### `UploadSprint`

1. **Camera recording:** countdown (configurable 15–45 s) → three audible beeps (T = 0) → recording → manual stop → upload.
2. **Manual entry:** enter sprint time in seconds directly.

The full-screen camera preview during the countdown lets the athlete position the phone at the finish line before T = 0. Sends `fps` alongside the video blob for the same reason as vertical.

### `UploadHorizontal`

Simple form. Sends `jump_distance_cm` and `session_date` to `POST /api/analyze/horizontal`.

---

## FormData for all endpoints

All three upload components use `FormData` (not JSON), including horizontal which has no file. This keeps the API surface uniform and avoids a separate content-type handling path on the backend.

---

## iOS Safari

`MediaRecorder` + WebM recording is not supported on iOS Safari. Both camera-recording components degrade gracefully: the countdown/recording flow is unavailable, but manual entry works on any browser.

---

## PWA

The app is installable on Android via Chrome's "Add to home screen". The service worker (`public/sw.js`) is minimal: it registers but applies no caching strategy, since the app requires a live backend connection at all times.
