FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod ./
COPY go.sum ./

# Make sure we're using the right Go version and clean up any toolchain directives
RUN sed -i 's/go 1.2[0-9]/go 1.22/' go.mod && \
    sed -i '/toolchain/d' go.mod && \
    go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/metrics-app ./cmd/metrics-app

# Final stage
FROM alpine:3.17

WORKDIR /app

# Install CA certificates
RUN apk --no-cache add ca-certificates

# Copy binary from builder stage
COPY --from=builder /app/metrics-app /app/metrics-app

# Expose default port
EXPOSE 8080

# Set environment to production by default
ENV ENVIRONMENT=production

# Run the application
CMD ["/app/metrics-app"] 