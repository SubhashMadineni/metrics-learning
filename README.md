# Metrics Learning

A Go application that generates random business metrics and exposes them through Prometheus, with Grafana for visualization.

## Features

- Random business metrics generation (orders processed, order values, active users, etc.)
- Prometheus metrics exposed via HTTP endpoint
- Grafana dashboards for visualization
- Development and production environments
- Docker Compose for easy deployment
- AWS CDK for infrastructure as code
- GitHub Actions for CI/CD

## Local Development

### Requirements

- Docker and Docker Compose
- Go 1.22+

### Running Locally

```bash
# Start the development environment
make dev-up

# Stop the development environment
make dev-down

# Build the application
make build

# Run the application locally
make run
```

### Environment Variables

- `ENVIRONMENT`: Set to `development` or `production` (default: `development`)
- `SERVER_PORT`: HTTP server port (default: `8080`)
- `METRICS_ENABLED`: Enable or disable metrics endpoint (default: `true`)
- `METRICS_PATH`: Path for the metrics endpoint (default: `/metrics`)
- `METRICS_INTERVAL`: Interval in seconds for generating metrics (default: `5`)
- `METRICS_VARIANCE`: Variance for random metrics generation (default: `0.5`)

## AWS Deployment

This project uses AWS CDK for infrastructure deployment and GitHub Actions for CI/CD.

### Prerequisites

1. Create a GitHub repository and push the code
2. Set up AWS credentials for GitHub Actions:
   - Create an IAM role with appropriate permissions
   - Add the role ARN as a GitHub secret named `AWS_ROLE_ARN`
3. Create an EC2 key pair named `metrics-app-key` in your AWS account

### Deployment Process

1. Push your code to the GitHub repository:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. GitHub Actions will automatically:
   - Build the Docker image
   - Push it to Amazon ECR
   - Deploy the infrastructure using CDK
   - Set up and configure the EC2 instance
   - Deploy the application on the EC2 instance

3. Access your application:
   - After deployment, check the AWS CloudFormation outputs for the EC2 instance IP
   - Access the services at:
     - Metrics App: http://[EC2-IP]:8080
     - Prometheus: http://[EC2-IP]:9090
     - Grafana: http://[EC2-IP]:3000 (username: admin, password: admin)

### Manual Deployment with CDK

If you need to deploy manually:

```bash
# Install CDK dependencies
cd cdk
npm install

# Deploy the CDK stack
npx cdk deploy
```

## Metrics

The application exposes the following business metrics:

- `business_orders_processed_total`: Counter for the total number of processed orders
- `business_order_value_dollars`: Histogram for the value of orders in dollars
- `business_active_users`: Gauge for the current number of active users
- `business_order_processing_seconds`: Histogram for order processing times

## Project Structure

```
metrics-learning/
├── .github/                  # GitHub Actions workflows
├── cmd/                      # Application entry points
│   └── metrics-app/          # Main application
├── cdk/                      # AWS CDK infrastructure
├── config/                   # Configuration files
│   ├── grafana/              # Grafana configuration
│   └── prometheus/           # Prometheus configuration
├── deployments/              # Deployment configurations
│   └── docker-compose/       # Docker Compose files
├── internal/                 # Internal packages
│   └── metrics/              # Metrics implementation
├── pkg/                      # Public packages
│   └── config/               # Configuration package
├── Dockerfile                # Docker build file
├── go.mod                    # Go module file
├── go.sum                    # Go dependencies checksums
├── Makefile                  # Build and deployment tasks
└── README.md                 # This file
``` 