.PHONY: build run test clean dev-up dev-down prod-up prod-down

# Build the application
build:
	go build -o bin/metrics-app ./cmd/metrics-app

# Run the application locally
run:
	go run ./cmd/metrics-app/main.go

# Run tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	rm -rf bin/

# Start development environment
dev-up:
	cd deployments/docker-compose && docker-compose -f docker-compose.dev.yml up -d

# Stop development environment
dev-down:
	cd deployments/docker-compose && docker-compose -f docker-compose.dev.yml down

# Start production environment
prod-up:
	cd deployments/docker-compose && docker-compose -f docker-compose.prod.yml up -d

# Stop production environment
prod-down:
	cd deployments/docker-compose && docker-compose -f docker-compose.prod.yml down

# Rebuild and restart development environment
dev-rebuild:
	cd deployments/docker-compose && docker-compose -f docker-compose.dev.yml up -d --build

# Rebuild and restart production environment
prod-rebuild:
	cd deployments/docker-compose && docker-compose -f docker-compose.prod.yml up -d --build

# Default target
all: build 