//! Error types for Ruvector-Mathpix
//!
//! Comprehensive error handling with context, HTTP status mapping, and retry logic.

use std::io;
use thiserror::Error;

/// Result type alias for Mathpix operations
pub type Result<T> = std::result::Result<T, MathpixError>;

/// Comprehensive error types for all Mathpix operations
#[derive(Debug, Error)]
pub enum MathpixError {
    /// Image loading or processing error
    #[error("Image error: {0}")]
    Image(String),

    /// Machine learning model error
    #[error("Model error: {0}")]
    Model(String),

    /// OCR processing error
    #[error("OCR error: {0}")]
    Ocr(String),

    /// LaTeX generation or parsing error
    #[error("LaTeX error: {0}")]
    LaTeX(String),

    /// Configuration error
    #[error("Configuration error: {0}")]
    Config(String),

    /// I/O error
    #[error("I/O error: {0}")]
    Io(#[from] io::Error),

    /// Serialization/deserialization error
    #[error("Serialization error: {0}")]
    Serialization(String),

    /// Invalid input error
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    /// Operation timeout
    #[error("Timeout: operation took longer than {0}s")]
    Timeout(u64),

    /// Resource not found
    #[error("Not found: {0}")]
    NotFound(String),

    /// Authentication error
    #[error("Authentication error: {0}")]
    Auth(String),

    /// Rate limit exceeded
    #[error("Rate limit exceeded: {0}")]
    RateLimit(String),

    /// Internal error
    #[error("Internal error: {0}")]
    Internal(String),
}

impl MathpixError {
    /// Check if the error is retryable
    ///
    /// # Returns
    ///
    /// `true` if the operation should be retried, `false` otherwise
    ///
    /// # Examples
    ///
    /// ```rust
    /// use ruvector_mathpix::MathpixError;
    ///
    /// let timeout_error = MathpixError::Timeout(30);
    /// assert!(timeout_error.is_retryable());
    ///
    /// let config_error = MathpixError::Config("Invalid parameter".to_string());
    /// assert!(!config_error.is_retryable());
    /// ```
    pub fn is_retryable(&self) -> bool {
        match self {
            // Retryable errors
            MathpixError::Timeout(_) => true,
            MathpixError::RateLimit(_) => true,
            MathpixError::Io(_) => true,
            MathpixError::Internal(_) => true,

            // Non-retryable errors
            MathpixError::Image(_) => false,
            MathpixError::Model(_) => false,
            MathpixError::Ocr(_) => false,
            MathpixError::LaTeX(_) => false,
            MathpixError::Config(_) => false,
            MathpixError::Serialization(_) => false,
            MathpixError::InvalidInput(_) => false,
            MathpixError::NotFound(_) => false,
            MathpixError::Auth(_) => false,
        }
    }

    /// Map error to HTTP status code
    ///
    /// # Returns
    ///
    /// HTTP status code representing the error type
    ///
    /// # Examples
    ///
    /// ```rust
    /// use ruvector_mathpix::MathpixError;
    ///
    /// let auth_error = MathpixError::Auth("Invalid token".to_string());
    /// assert_eq!(auth_error.status_code(), 401);
    ///
    /// let not_found = MathpixError::NotFound("Model not found".to_string());
    /// assert_eq!(not_found.status_code(), 404);
    /// ```
    pub fn status_code(&self) -> u16 {
        match self {
            MathpixError::Auth(_) => 401,
            MathpixError::NotFound(_) => 404,
            MathpixError::InvalidInput(_) => 400,
            MathpixError::RateLimit(_) => 429,
            MathpixError::Timeout(_) => 408,
            MathpixError::Config(_) => 400,
            MathpixError::Internal(_) => 500,
            _ => 500,
        }
    }

    /// Get error category for logging and metrics
    pub fn category(&self) -> &'static str {
        match self {
            MathpixError::Image(_) => "image",
            MathpixError::Model(_) => "model",
            MathpixError::Ocr(_) => "ocr",
            MathpixError::LaTeX(_) => "latex",
            MathpixError::Config(_) => "config",
            MathpixError::Io(_) => "io",
            MathpixError::Serialization(_) => "serialization",
            MathpixError::InvalidInput(_) => "invalid_input",
            MathpixError::Timeout(_) => "timeout",
            MathpixError::NotFound(_) => "not_found",
            MathpixError::Auth(_) => "auth",
            MathpixError::RateLimit(_) => "rate_limit",
            MathpixError::Internal(_) => "internal",
        }
    }
}

// Conversion from serde_json::Error
impl From<serde_json::Error> for MathpixError {
    fn from(err: serde_json::Error) -> Self {
        MathpixError::Serialization(err.to_string())
    }
}

// Conversion from toml::de::Error
impl From<toml::de::Error> for MathpixError {
    fn from(err: toml::de::Error) -> Self {
        MathpixError::Config(err.to_string())
    }
}

// Conversion from toml::ser::Error
impl From<toml::ser::Error> for MathpixError {
    fn from(err: toml::ser::Error) -> Self {
        MathpixError::Serialization(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = MathpixError::Image("Failed to load".to_string());
        assert_eq!(err.to_string(), "Image error: Failed to load");
    }

    #[test]
    fn test_is_retryable() {
        assert!(MathpixError::Timeout(30).is_retryable());
        assert!(MathpixError::RateLimit("Exceeded".to_string()).is_retryable());
        assert!(!MathpixError::Config("Invalid".to_string()).is_retryable());
        assert!(!MathpixError::Auth("Unauthorized".to_string()).is_retryable());
    }

    #[test]
    fn test_status_codes() {
        assert_eq!(MathpixError::Auth("".to_string()).status_code(), 401);
        assert_eq!(MathpixError::NotFound("".to_string()).status_code(), 404);
        assert_eq!(MathpixError::InvalidInput("".to_string()).status_code(), 400);
        assert_eq!(MathpixError::RateLimit("".to_string()).status_code(), 429);
        assert_eq!(MathpixError::Timeout(0).status_code(), 408);
        assert_eq!(MathpixError::Internal("".to_string()).status_code(), 500);
    }

    #[test]
    fn test_category() {
        assert_eq!(MathpixError::Image("".to_string()).category(), "image");
        assert_eq!(MathpixError::Model("".to_string()).category(), "model");
        assert_eq!(MathpixError::Ocr("".to_string()).category(), "ocr");
        assert_eq!(MathpixError::LaTeX("".to_string()).category(), "latex");
        assert_eq!(MathpixError::Config("".to_string()).category(), "config");
        assert_eq!(MathpixError::Auth("".to_string()).category(), "auth");
    }

    #[test]
    fn test_from_io_error() {
        let io_err = io::Error::new(io::ErrorKind::NotFound, "File not found");
        let mathpix_err: MathpixError = io_err.into();
        assert!(matches!(mathpix_err, MathpixError::Io(_)));
    }

    #[test]
    fn test_from_json_error() {
        let json_err = serde_json::from_str::<serde_json::Value>("invalid json").unwrap_err();
        let mathpix_err: MathpixError = json_err.into();
        assert!(matches!(mathpix_err, MathpixError::Serialization(_)));
    }
}
