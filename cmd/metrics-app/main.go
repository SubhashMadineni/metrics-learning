package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/metrics-learning/config"
	"github.com/metrics-learning/internal/metrics"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()
	
	// Set up logger
	logger := log.New(os.Stdout, "", log.LstdFlags)
	logger.Printf("Starting metrics application in %s mode", cfg.Environment)
	
	// Create metrics HTTP server
	mux := http.NewServeMux()
	
	// Register metrics endpoint
	if cfg.MetricsEnabled {
		mux.Handle(cfg.MetricsPath, promhttp.Handler())
		logger.Printf("Metrics endpoint enabled at %s", cfg.MetricsPath)
	}
	
	// Add a health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
	
	// Add a root endpoint
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		fmt.Fprintf(w, "Metrics App - %s Environment\n", cfg.Environment)
		fmt.Fprintf(w, "Check %s for Prometheus metrics\n", cfg.MetricsPath)
	})
	
	// Create HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.ServerPort),
		Handler: mux,
	}
	
	// Start metrics simulator
	simulator := metrics.NewMetricsSimulator(cfg.MetricsInterval, cfg.MetricsVariance)
	simulator.Start()
	
	// Start server in a goroutine
	go func() {
		logger.Printf("HTTP server listening on port %d", cfg.ServerPort)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("HTTP server error: %v", err)
		}
	}()
	
	// Set up graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	
	// Wait for shutdown signal
	<-quit
	logger.Println("Shutting down server...")
	
	// Create context with timeout for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	// Stop metrics simulator
	simulator.Stop()
	
	// Attempt graceful shutdown
	if err := server.Shutdown(ctx); err != nil {
		logger.Fatalf("Server forced to shutdown: %v", err)
	}
	
	logger.Println("Server exited gracefully")
} 