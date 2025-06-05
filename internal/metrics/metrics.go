package metrics

import (
	"math/rand"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Business metrics we'll track
var (
	// OrdersProcessed tracks the number of orders processed
	OrdersProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "business_orders_processed_total",
		Help: "The total number of processed orders",
	})

	// OrderValue tracks the value of orders
	OrderValue = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "business_order_value_dollars",
		Help:    "The value of orders in dollars",
		Buckets: prometheus.LinearBuckets(10, 10, 10), // 10-100 in steps of 10
	})

	// ActiveUsers tracks the number of active users
	ActiveUsers = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "business_active_users",
		Help: "The current number of active users",
	})

	// OrderProcessingTime tracks how long it takes to process orders
	OrderProcessingTime = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "business_order_processing_seconds",
		Help:    "Time taken to process orders",
		Buckets: prometheus.ExponentialBuckets(0.1, 2, 5), // 0.1, 0.2, 0.4, 0.8, 1.6
	})
)

// MetricsSimulator simulates business metrics for demonstration
type MetricsSimulator struct {
	interval  int
	variance  float64
	baseUsers int
	stopCh    chan struct{}
	wg        sync.WaitGroup
}

// NewMetricsSimulator creates a new metrics simulator
func NewMetricsSimulator(interval int, variance float64) *MetricsSimulator {
	return &MetricsSimulator{
		interval:  interval,
		variance:  variance,
		baseUsers: 100,
		stopCh:    make(chan struct{}),
	}
}

// Start begins simulating metrics
func (s *MetricsSimulator) Start() {
	s.wg.Add(1)
	go s.simulateMetrics()
}

// Stop stops the metrics simulation
func (s *MetricsSimulator) Stop() {
	close(s.stopCh)
	s.wg.Wait()
}

// simulateMetrics generates random business metrics
func (s *MetricsSimulator) simulateMetrics() {
	defer s.wg.Done()

	ticker := time.NewTicker(time.Duration(s.interval) * time.Second)
	defer ticker.Stop()

	rand.Seed(time.Now().UnixNano())

	for {
		select {
		case <-ticker.C:
			// Simulate processing orders
			orderCount := rand.Intn(5) + 1
			for i := 0; i < orderCount; i++ {
				OrdersProcessed.Inc()
				
				// Simulate order value
				value := 10.0 + rand.Float64()*90.0
				OrderValue.Observe(value)
				
				// Simulate processing time
				procTime := 0.1 + rand.Float64()*1.5
				OrderProcessingTime.Observe(procTime)
			}
			
			// Simulate active users with some variance
			userVariance := int(float64(s.baseUsers) * s.variance)
			userCount := s.baseUsers + rand.Intn(userVariance*2) - userVariance
			ActiveUsers.Set(float64(userCount))
			
		case <-s.stopCh:
			return
		}
	}
} 