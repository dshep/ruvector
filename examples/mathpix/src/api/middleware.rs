use axum::{
    extract::{Request, State},
    http::HeaderMap,
    middleware::Next,
    response::Response,
};
use governor::{
    clock::DefaultClock,
    state::{InMemoryState, NotKeyed},
    Quota, RateLimiter,
};
use nonzero_ext::nonzero;
use std::sync::Arc;
use tracing::{debug, warn};

use super::{responses::ErrorResponse, state::AppState};

/// Authentication middleware
/// Validates app_id and app_key from headers or query parameters
pub async fn auth_middleware(
    State(state): State<AppState>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<Response, ErrorResponse> {
    // Extract credentials from headers
    let app_id = headers
        .get("app_id")
        .and_then(|v| v.to_str().ok())
        .or_else(|| {
            // Fallback to query parameters
            request
                .uri()
                .query()
                .and_then(|q| extract_query_param(q, "app_id"))
        });

    let app_key = headers
        .get("app_key")
        .and_then(|v| v.to_str().ok())
        .or_else(|| {
            request
                .uri()
                .query()
                .and_then(|q| extract_query_param(q, "app_key"))
        });

    // Validate credentials
    match (app_id, app_key) {
        (Some(id), Some(key)) => {
            if validate_credentials(&state, id, key).await {
                debug!("Authentication successful for app_id: {}", id);
                Ok(next.run(request).await)
            } else {
                warn!("Invalid credentials for app_id: {}", id);
                Err(ErrorResponse::unauthorized("Invalid credentials"))
            }
        }
        _ => {
            warn!("Missing authentication credentials");
            Err(ErrorResponse::unauthorized("Missing app_id or app_key"))
        }
    }
}

/// Rate limiting middleware using token bucket algorithm
pub async fn rate_limit_middleware(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, ErrorResponse> {
    // Check rate limit
    match state.rate_limiter.check() {
        Ok(_) => {
            debug!("Rate limit check passed");
            Ok(next.run(request).await)
        }
        Err(_) => {
            warn!("Rate limit exceeded");
            Err(ErrorResponse::rate_limited(
                "Rate limit exceeded. Please try again later.",
            ))
        }
    }
}

/// Validate app credentials
async fn validate_credentials(_state: &AppState, app_id: &str, app_key: &str) -> bool {
    // TODO: Implement actual credential validation
    // For now, accept any non-empty credentials
    !app_id.is_empty() && !app_key.is_empty()
}

/// Extract query parameter from query string
fn extract_query_param<'a>(query: &'a str, param: &str) -> Option<&'a str> {
    query
        .split('&')
        .find_map(|pair| {
            let mut parts = pair.split('=');
            match (parts.next(), parts.next()) {
                (Some(k), Some(v)) if k == param => Some(v),
                _ => None,
            }
        })
}

/// Create a rate limiter with token bucket algorithm
pub fn create_rate_limiter() -> Arc<RateLimiter<NotKeyed, InMemoryState, DefaultClock>> {
    // Allow 100 requests per minute
    let quota = Quota::per_minute(nonzero!(100u32));
    Arc::new(RateLimiter::direct(quota))
}

/// Type alias for rate limiter
pub type AppRateLimiter = Arc<RateLimiter<NotKeyed, InMemoryState, DefaultClock>>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_query_param() {
        let query = "app_id=123&app_key=secret&foo=bar";
        assert_eq!(extract_query_param(query, "app_id"), Some("123"));
        assert_eq!(extract_query_param(query, "app_key"), Some("secret"));
        assert_eq!(extract_query_param(query, "foo"), Some("bar"));
        assert_eq!(extract_query_param(query, "missing"), None);
    }

    #[tokio::test]
    async fn test_validate_credentials() {
        let state = AppState::new();
        assert!(validate_credentials(&state, "test", "key").await);
        assert!(!validate_credentials(&state, "", "key").await);
        assert!(!validate_credentials(&state, "test", "").await);
    }
}
