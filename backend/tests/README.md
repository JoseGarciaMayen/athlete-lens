# Tests

## Running tests

All commands must be run from the `backend/` directory:

```bash
cd backend
```

**Run everything except integration tests** (fast, no fixtures needed):

```bash
uv run pytest -m "not integration"
```

**Run only integration tests** (requires fixture files, see below):

```bash
uv run pytest -m integration
```

**Run everything:**

```bash
uv run pytest
```

---

## Test structure

```
tests/
├── conftest.py              # Shared fixtures: test DB, TestClient, YOLO model
├── api/
│   ├── test_horizontal.py   # POST /api/analyze/horizontal
│   ├── test_vertical.py     # POST /api/analyze/vertical
│   ├── test_sprint.py       # POST /api/analyze/sprint
│   └── test_sessions.py     # athlete profile, sessions, dashboard, metrics
└── core/
    ├── vertical/            # Unit tests for vertical extractor functions
    └── sprint/              # Unit tests for sprint extractor functions
```

---

## Integration tests and fixtures

Tests marked with `@pytest.mark.integration` require real media files that are **not** committed to the repository (personal recordings).

Place the following files manually before running integration tests:

| Path | Description |
|------|-------------|
| `tests/core/vertical/fixtures/video.mp4` | Side-on video of a vertical jump. The athlete must be fully visible for the entire jump with at least 15 frames of standing still at the start. |
| `tests/core/sprint/fixtures/video.mp4` | Finish-line video of a sprint. The athlete must cross the horizontal midpoint of the frame. |

---

## How the test database works

Tests use a file-based SQLite database (`backend/test.db`) rather than an in-memory database.

**Why not in-memory?** FastAPI's `TestClient` runs the app in a different thread from the test itself. SQLite in-memory databases are bound to a single connection, which caused `"no such table"` errors when the endpoint tried to read from a database created in the fixture thread. A file-based database is shared correctly across threads via the same engine.

`test.db` is created and dropped around each test via the `db_session` fixture in `conftest.py`, and it is listed in `.gitignore`.

---

## How database and model injection work

`conftest.py` defines two fixtures:

- **`db_session`**: creates all tables in `test.db`, yields a `TestingSessionLocal` session, then drops all tables after the test.
- **`client`**: overrides `get_db` with a function that yields the test session, sets `app.state.model` and `app.state.device` if not already set, then creates the `TestClient`. Dependency overrides are cleared after each test.

This pattern (`app.dependency_overrides`) is the standard FastAPI approach for swapping dependencies in tests.

---

## What integration tests verify

API integration tests do not just check `response.status_code == 200`. They also query the test database directly to confirm that the record was actually written, catching bugs where the endpoint returns a valid response but silently fails to persist.

---

## Adding new tests

1. **Unit tests** for a new core function: add a file under `tests/core/<module>/`. Use `pytest.approx` for float comparisons.
2. **API integration tests**: add a file under `tests/api/`. Use the `client` fixture; it injects the test database and YOLO model automatically.
3. **Tests requiring media files**: mark with `@pytest.mark.integration` and document the required fixture file in this README.
