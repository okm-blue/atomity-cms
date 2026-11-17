.PHONY: help up down demo db backend frontend install test check docker-test docker-check consumer-test

help:
	@echo "up              Start Postgres, backend and admin UI"
	@echo "demo            Start the example consumer and run the publishing walkthrough"
	@echo "down            Stop services (keeps database and media volumes)"
	@echo "check           Run backend and frontend checks using local toolchains"
	@echo "docker-test     Run backend tests in Docker"
	@echo "docker-check    Run frontend lint, types, tests and production build in Docker"

up:
	docker compose up --build -d

down:
	docker compose down

demo:
	docker compose --profile demo up --build -d

db:
	docker compose up -d postgres

backend:
	cd backend && ./gradlew bootRun

frontend:
	cd frontend && npm run dev

install:
	cd frontend && npm install

check:
	cd backend && ./gradlew test
	cd frontend && npm run lint && npm run typecheck && npm test && npm run build

test: docker-test

docker-test:
	docker compose --profile test run --build --rm backend-test

docker-check:
	docker compose --profile test run --build --rm frontend-check

consumer-test:
	cd examples/mock-consumer && npm test
