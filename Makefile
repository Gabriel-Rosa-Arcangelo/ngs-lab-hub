COMPOSE ?= docker compose
WEB ?= web
MANAGE = $(COMPOSE) exec $(WEB) python manage.py

.PHONY: up down logs migrate seed test format lint demo

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f --tail=200

migrate:
	$(MANAGE) migrate

seed:
	$(MANAGE) seed_db --units 10 --exams 30 --results 50000

test:
	$(MANAGE) test

format:
	$(COMPOSE) exec $(WEB) sh -lc 'if command -v ruff >/dev/null 2>&1; then ruff format /app; elif command -v black >/dev/null 2>&1; then black /app; else echo "No formatter installed in container (ruff/black)."; fi'

lint:
	$(COMPOSE) exec $(WEB) sh -lc 'if command -v ruff >/dev/null 2>&1; then ruff check /app; elif command -v flake8 >/dev/null 2>&1; then flake8 /app; else python manage.py check; fi'

demo:
	./scripts/demo_bootstrap.sh
