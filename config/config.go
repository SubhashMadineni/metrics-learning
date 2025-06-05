package config

import (
	"os"
	"strconv"
)

// Config holds the application configuration
type Config struct {
	// Server settings
	ServerPort int
	// Metrics settings
	MetricsEnabled bool
	MetricsPath    string
	// Environment
	Environment string
	// Business metrics simulation settings
	MetricsInterval int // in seconds
	MetricsVariance float64
}

// Environments
const (
	EnvDevelopment = "development"
	EnvProduction  = "production"
)

// LoadConfig loads the configuration based on the environment
func LoadConfig() *Config {
	env := getEnv("ENVIRONMENT", EnvDevelopment)
	
	cfg := &Config{
		ServerPort:      getEnvAsInt("SERVER_PORT", 8080),
		MetricsEnabled:  getEnvAsBool("METRICS_ENABLED", true),
		MetricsPath:     getEnv("METRICS_PATH", "/metrics"),
		Environment:     env,
		MetricsInterval: getEnvAsInt("METRICS_INTERVAL", 5),
		MetricsVariance: getEnvAsFloat("METRICS_VARIANCE", 0.5),
	}
	
	return cfg
}

// IsDevelopment returns true if the environment is development
func (c *Config) IsDevelopment() bool {
	return c.Environment == EnvDevelopment
}

// IsProduction returns true if the environment is production
func (c *Config) IsProduction() bool {
	return c.Environment == EnvProduction
}

// Helper functions to get environment variables with default values
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func getEnvAsFloat(key string, defaultValue float64) float64 {
	if value, exists := os.LookupEnv(key); exists {
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			return floatValue
		}
	}
	return defaultValue
} 