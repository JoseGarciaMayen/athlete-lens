# Contributing

---

## Design principles

- **Single athlete, no authentication.** One profile, seeded at startup. Multi-user support is out of scope.
- **SQLite, no migrations.** Schema changes require recreating the database with a manual backup. No migration tooling overhead for a single-user app.
- **`{success, error}` error contract.** All `core/*/extractor.py` functions return dicts, not exceptions. This is consistent across all modules. Don't introduce exceptions in new modules.
- **Synchronous endpoints.** Routes are `def`, not `async def`. Analysis is CPU-bound; `def` lets FastAPI run handlers in the thread pool, which is correct here.
- **Model and device injected as parameters.** Never instantiate `YOLO(...)` inside a module function. Receive `model` and `device` from the caller.

---

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`, `test`, `refactor`, `chore`, `docs`.

Commit only when something works. Never mid-function.

---

## Adding a new metric module

A new module (e.g. `core/agility/`) should follow the pattern established by `core/vertical/` and `core/sprint/`:

1. `extractor.py` with a top-level `analyze(video_path, model, device, ...) -> dict` function.
2. All functions return `{"success": bool, "error": str}` on failure, a data dict on success.
3. A corresponding SQLAlchemy model in `db/models.py` with a `session_id` FK and `created_at` timestamp.
4. CRUD functions in `db/crud.py`.
5. A FastAPI route in `api/routes/`. Use `def`, not `async def`.
6. Tests alongside the code. Integration tests (requiring real video fixtures) marked `@pytest.mark.integration`. See [tests/README.md](backend/tests/README.md).
7. A `README.md` under `core/<module>/` documenting technical decisions. See [vertical](backend/core/vertical/README.md) and [sprint](backend/core/sprint/README.md) for reference.

---

## Running tests

```bash
cd backend
uv run pytest -m "not integration"   # fast, no fixtures needed
uv run pytest                         # all tests (requires video fixtures)
```

Video fixtures are not versioned. Place them at `tests/core/<module>/fixtures/`. Document required fixture paths in `tests/README.md`.

---

## Running the stack locally

```bash
./setup.sh
```

This installs all dependencies on first run, then starts backend (port 8000) and frontend (port 5173) concurrently. See the root [README](README.md) for full setup instructions.

---

## Environment

- Backend: `uv` manages the virtualenv. Always run Python commands with `uv run`.
- Frontend: standard `npm`. Variables go in `frontend/.env` (gitignored). Update `frontend/.env.example` if you add a new variable.
- Linting: backend uses `ruff`. Run `uvx ruff check .` from `backend/` before committing.
