# Metrics Learning

A Go application that generates random business metrics and exposes them through Prometheus, with Grafana for visualization.

## Features

- Random business metrics generation (orders processed, order values, active users, etc.)
- Prometheus metrics exposed via HTTP endpoint
- Grafana dashboards for visualization
- Development and production environments
- Docker Compose for easy deployment

## Requirements

- Docker and Docker Compose
- Go 1.16+ (only for local development)

## Quick Start

### Development Environment

To start the application in development mode:

```bash
cd deployments/docker-compose
docker-compose -f docker-compose.dev.yml up
```

This will start:
- The metrics application on port 8080
- Prometheus on port 9090
- Grafana on port 3000 (username: admin, password: admin)

### Production Environment

To start the application in production mode:

```bash
cd deployments/docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

For production, you can set a custom Grafana admin password:

```bash
GRAFANA_ADMIN_PASSWORD=your_secure_password docker-compose -f docker-compose.prod.yml up -d
```

## Accessing the Services

- Metrics Application: http://localhost:8080
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

In Grafana, a default dashboard called "Business Metrics Dashboard" is already set up with visualizations for all the metrics.

## Development

### Local Development

To run the application locally:

```bash
go mod tidy
go run cmd/metrics-app/main.go
```

Or use the provided Makefile:

```bash
# Build the application
make build

# Run the application
make run

# Start development environment with Docker Compose
make dev-up

# Stop development environment
make dev-down
```

By default, this will start the application in development mode.

### Environment Variables

- `ENVIRONMENT`: Set to `development` or `production` (default: `development`)
- `SERVER_PORT`: HTTP server port (default: `8080`)
- `METRICS_ENABLED`: Enable or disable metrics endpoint (default: `true`)
- `METRICS_PATH`: Path for the metrics endpoint (default: `/metrics`)
- `METRICS_INTERVAL`: Interval in seconds for generating metrics (default: `5`)
- `METRICS_VARIANCE`: Variance for random metrics generation (default: `0.5`)

## Metrics

The application exposes the following business metrics:

- `business_orders_processed_total`: Counter for the total number of processed orders
- `business_order_value_dollars`: Histogram for the value of orders in dollars
- `business_active_users`: Gauge for the current number of active users
- `business_order_processing_seconds`: Histogram for order processing times

## Project Structure

```
metrics-learning/
├── cmd/                     # Application entry points
│   └── metrics-app/         # Main application
├── config/                  # Configuration files
│   ├── grafana/             # Grafana configuration
│   └── prometheus/          # Prometheus configuration
├── deployments/             # Deployment configurations
│   └── docker-compose/      # Docker Compose files
├── internal/                # Internal packages
│   └── metrics/             # Metrics implementation
├── pkg/                     # Public packages
│   └── config/              # Configuration package
├── Dockerfile               # Docker build file
├── go.mod                   # Go module file
├── go.sum                   # Go dependencies checksums
├── Makefile                 # Build and deployment tasks
└── README.md                # This file
``` 