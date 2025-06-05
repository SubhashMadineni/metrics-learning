#!/bin/bash -xe

# Get the ECR repository URI passed as an argument
ECR_REPO_URI=$1

# Update the system and install dependencies
yum update -y
yum install -y docker git amazon-ecr-credential-helper jq

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Configure Docker to use ECR credential helper
mkdir -p /root/.docker
cat > /root/.docker/config.json << 'EOF'
{
  "credHelpers": {
    "public.ecr.aws": "ecr-login",
    "${ECR_REPO_URI%%/*}": "ecr-login"
  }
}
EOF

# Download docker-compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/metrics-app

# Create docker-compose.yml file for production
cat > /opt/metrics-app/docker-compose.yml << 'EOF'
version: '3.8'

services:
  metrics-app:
    image: ${ECR_REPO_URI}:latest
    ports:
      - "8080:8080"
    environment:
      - ENVIRONMENT=production
      - METRICS_INTERVAL=5
      - METRICS_VARIANCE=0.5
    networks:
      - metrics-network
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus/prometheus.prod.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - metrics-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana/provisioning:/etc/grafana/provisioning
      - ./config/grafana/dashboards:/var/lib/grafana/dashboards
    networks:
      - metrics-network
    depends_on:
      - prometheus
    restart: unless-stopped

networks:
  metrics-network:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
EOF

# Create configuration directories
mkdir -p /opt/metrics-app/config/prometheus
mkdir -p /opt/metrics-app/config/grafana/provisioning/{datasources,dashboards}
mkdir -p /opt/metrics-app/config/grafana/dashboards

# Create Prometheus config
cat > /opt/metrics-app/config/prometheus/prometheus.prod.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

scrape_configs:
  - job_name: 'metrics-app'
    static_configs:
      - targets: ['metrics-app:8080']
    metrics_path: /metrics
    scheme: http
    scrape_interval: 10s
    scrape_timeout: 5s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
EOF

# Create Grafana datasource config
cat > /opt/metrics-app/config/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

# Create Grafana dashboard provider config
cat > /opt/metrics-app/config/grafana/provisioning/dashboards/dashboard.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'Business Metrics'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards
EOF

# Create a deployment script
cat > /opt/metrics-app/deploy.sh << 'EOF'
#!/bin/bash
cd /opt/metrics-app
ECR_REPO_URI=$(aws ecr describe-repositories --repository-names metrics-app --query 'repositories[0].repositoryUri' --output text)
sed -i "s|\${ECR_REPO_URI}|$ECR_REPO_URI|g" docker-compose.yml
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REPO_URI
docker-compose pull
docker-compose up -d
EOF

chmod +x /opt/metrics-app/deploy.sh

# Create a systemd service for automatic startup
cat > /etc/systemd/system/metrics-app.service << 'EOF'
[Unit]
Description=Metrics Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/metrics-app
ExecStart=/opt/metrics-app/deploy.sh
ExecStop=/usr/local/bin/docker-compose -f /opt/metrics-app/docker-compose.yml down

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable metrics-app
systemctl start metrics-app

# Install a simple dashboard
cat > /opt/metrics-app/config/grafana/dashboards/business_metrics.json << 'EOF'
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": 1,
  "links": [],
  "panels": [
    {
      "datasource": null,
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "drawStyle": "line",
            "fillOpacity": 10,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "never",
            "spanNulls": true,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          },
          "unit": "short"
        },
        "overrides": []
      },
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "id": 2,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom"
        },
        "tooltip": {
          "mode": "single"
        }
      },
      "title": "Orders Processed",
      "type": "timeseries",
      "targets": [
        {
          "exemplar": true,
          "expr": "rate(business_orders_processed_total[1m])",
          "interval": "",
          "legendFormat": "Orders/min",
          "refId": "A"
        }
      ]
    },
    {
      "datasource": null,
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              },
              {
                "color": "yellow",
                "value": 80
              },
              {
                "color": "red",
                "value": 150
              }
            ]
          },
          "unit": "none"
        },
        "overrides": []
      },
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 12,
        "y": 0
      },
      "id": 4,
      "options": {
        "orientation": "auto",
        "reduceOptions": {
          "calcs": [
            "lastNotNull"
          ],
          "fields": "",
          "values": false
        },
        "showThresholdLabels": false,
        "showThresholdMarkers": true,
        "text": {}
      },
      "pluginVersion": "8.0.0",
      "title": "Active Users",
      "type": "gauge",
      "targets": [
        {
          "exemplar": true,
          "expr": "business_active_users",
          "interval": "",
          "legendFormat": "Users",
          "refId": "A"
        }
      ]
    }
  ],
  "refresh": "5s",
  "schemaVersion": 30,
  "style": "dark",
  "tags": [],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-30m",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "Business Metrics Dashboard",
  "uid": "business-metrics",
  "version": 1
}
EOF 