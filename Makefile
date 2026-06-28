.PHONY: ci

ci:
	cd backend && uvx ruff check .
	cd backend && uvx ruff format --check .
	cd backend && uv run pytest -m "not integration"
