use moka::future::Cache;
use std::sync::Arc;
use std::time::Duration;

use super::{jobs::JobQueue, middleware::{create_rate_limiter, AppRateLimiter}};

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    /// Job queue for async PDF processing
    pub job_queue: Arc<JobQueue>,

    /// Result cache
    pub cache: Cache<String, String>,

    /// Rate limiter
    pub rate_limiter: AppRateLimiter,
}

impl AppState {
    /// Create a new application state instance
    pub fn new() -> Self {
        Self {
            job_queue: Arc::new(JobQueue::new()),
            cache: create_cache(),
            rate_limiter: create_rate_limiter(),
        }
    }

    /// Create state with custom configuration
    pub fn with_config(max_jobs: usize, cache_size: u64) -> Self {
        Self {
            job_queue: Arc::new(JobQueue::with_capacity(max_jobs)),
            cache: Cache::builder()
                .max_capacity(cache_size)
                .time_to_live(Duration::from_secs(3600))
                .time_to_idle(Duration::from_secs(600))
                .build(),
            rate_limiter: create_rate_limiter(),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

/// Create a cache with default configuration
fn create_cache() -> Cache<String, String> {
    Cache::builder()
        // Max 10,000 entries
        .max_capacity(10_000)
        // Time to live: 1 hour
        .time_to_live(Duration::from_secs(3600))
        // Time to idle: 10 minutes
        .time_to_idle(Duration::from_secs(600))
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_state_creation() {
        let state = AppState::new();
        assert!(Arc::strong_count(&state.job_queue) >= 1);
    }

    #[tokio::test]
    async fn test_state_with_config() {
        let state = AppState::with_config(100, 5000);
        assert!(Arc::strong_count(&state.job_queue) >= 1);
    }

    #[tokio::test]
    async fn test_cache_operations() {
        let state = AppState::new();

        // Insert value
        state.cache.insert("key1".to_string(), "value1".to_string()).await;

        // Retrieve value
        let value = state.cache.get(&"key1".to_string()).await;
        assert_eq!(value, Some("value1".to_string()));

        // Non-existent key
        let missing = state.cache.get(&"missing".to_string()).await;
        assert_eq!(missing, None);
    }
}
