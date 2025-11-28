// Full pipeline integration tests
//
// Tests the complete OCR pipeline from image input to final output

use super::*;
use tokio;

#[tokio::test]
async fn test_png_to_latex_pipeline() {
    let test_server = TestServer::start().await.expect("Failed to start test server");

    // Create test image
    let image = images::generate_simple_equation("x^2 + 2x + 1");
    let image_path = "/tmp/test_equation.png";
    image.save(image_path).unwrap();

    // Process through pipeline
    let result = test_server.process_image(image_path, OutputFormat::LaTeX)
        .await
        .expect("Pipeline processing failed");

    // Verify output
    assert!(!result.latex.is_empty(), "LaTeX output should not be empty");
    assert!(result.confidence > 0.7, "Confidence too low: {}", result.confidence);
    assert!(result.latex.contains("x"), "Should contain variable x");

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_jpeg_to_mathml_pipeline() {
    let test_server = TestServer::start().await.expect("Failed to start test server");

    // Create JPEG test image
    let image = images::generate_fraction(1, 2);
    let image_path = "/tmp/test_fraction.jpg";
    image.save(image_path).unwrap();

    // Process to MathML
    let result = test_server.process_image(image_path, OutputFormat::MathML)
        .await
        .expect("Pipeline processing failed");

    // Verify MathML structure
    assert!(result.mathml.is_some(), "MathML output should be present");
    let mathml = result.mathml.unwrap();
    assert!(mathml.contains("<mfrac>"), "Should contain fraction tag");
    assert!(mathml.contains("<mn>1</mn>"), "Should contain numerator");
    assert!(mathml.contains("<mn>2</mn>"), "Should contain denominator");

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_webp_to_html_pipeline() {
    let test_server = TestServer::start().await.expect("Failed to start test server");

    // Create WebP test image
    let image = images::generate_integral("x dx");
    let image_path = "/tmp/test_integral.webp";
    // Note: WebP support may require additional image codec
    image.save(image_path).unwrap_or_else(|_| {
        // Fallback to PNG if WebP not supported
        image.save("/tmp/test_integral.png").unwrap();
    });

    let actual_path = if std::path::Path::new(image_path).exists() {
        image_path
    } else {
        "/tmp/test_integral.png"
    };

    // Process to HTML
    let result = test_server.process_image(actual_path, OutputFormat::HTML)
        .await
        .expect("Pipeline processing failed");

    // Verify HTML output
    assert!(result.html.is_some(), "HTML output should be present");
    let html = result.html.unwrap();
    assert!(html.contains("<math") || html.contains("&int;"), "Should contain integral representation");

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_pipeline_error_propagation() {
    let test_server = TestServer::start().await.expect("Failed to start test server");

    // Test with invalid image path
    let result = test_server.process_image("/nonexistent/image.png", OutputFormat::LaTeX).await;
    assert!(result.is_err(), "Should fail for nonexistent file");

    // Test with corrupted image
    std::fs::write("/tmp/corrupted.png", b"not an image").unwrap();
    let result = test_server.process_image("/tmp/corrupted.png", OutputFormat::LaTeX).await;
    assert!(result.is_err(), "Should fail for corrupted image");

    // Test with oversized image
    let huge_image = images::generate_blank(10000, 10000);
    huge_image.save("/tmp/huge.png").unwrap();
    let result = test_server.process_image("/tmp/huge.png", OutputFormat::LaTeX).await;
    // Should either process or return size error
    assert!(result.is_ok() || result.unwrap_err().contains("too large"));

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_pipeline_timeout_handling() {
    let test_server = TestServer::with_timeout(100).await
        .expect("Failed to start test server");

    // Create complex image that might take time
    let complex_image = images::generate_complex_equation();
    complex_image.save("/tmp/complex.png").unwrap();

    let start = std::time::Instant::now();
    let result = test_server.process_image("/tmp/complex.png", OutputFormat::LaTeX).await;
    let duration = start.elapsed();

    // Should either complete or timeout within reasonable time
    assert!(duration.as_millis() < 200, "Should timeout or complete quickly");

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_batch_pipeline_processing() {
    let test_server = TestServer::start().await.expect("Failed to start test server");

    // Create multiple test images
    let images = vec![
        ("x + y", "/tmp/batch_1.png"),
        ("a - b", "/tmp/batch_2.png"),
        ("2 * 3", "/tmp/batch_3.png"),
        ("x / y", "/tmp/batch_4.png"),
    ];

    for (equation, path) in &images {
        let img = images::generate_simple_equation(equation);
        img.save(path).unwrap();
    }

    // Process batch
    let paths: Vec<&str> = images.iter().map(|(_, p)| *p).collect();
    let results = test_server.process_batch(&paths, OutputFormat::LaTeX)
        .await
        .expect("Batch processing failed");

    // Verify all processed
    assert_eq!(results.len(), 4, "Should process all images");
    for (i, result) in results.iter().enumerate() {
        assert!(!result.latex.is_empty(), "Result {} should have LaTeX", i);
        assert!(result.confidence > 0.5, "Result {} confidence too low", i);
    }

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_pipeline_with_preprocessing() {
    let test_server = TestServer::start().await.expect("Failed to start test server");

    // Create noisy image
    let mut image = images::generate_simple_equation("f(x) = x^2");
    images::add_noise(&mut image, 0.1);
    image.save("/tmp/noisy.png").unwrap();

    // Process with preprocessing enabled
    let result = test_server.process_image_with_options(
        "/tmp/noisy.png",
        OutputFormat::LaTeX,
        ProcessingOptions {
            enable_preprocessing: true,
            enable_denoising: true,
            enable_deskew: true,
            ..Default::default()
        }
    ).await.expect("Processing failed");

    // Should still recognize despite noise
    assert!(!result.latex.is_empty(), "Should extract LaTeX from noisy image");
    assert!(result.latex.contains("f(x)"), "Should recognize function");

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_multi_format_output() {
    let test_server = TestServer::start().await.expect("Failed to start test server");

    // Create test image
    let image = images::generate_fraction(3, 4);
    image.save("/tmp/fraction.png").unwrap();

    // Request multiple output formats
    let result = test_server.process_image_with_options(
        "/tmp/fraction.png",
        OutputFormat::All,
        ProcessingOptions {
            include_latex: true,
            include_mathml: true,
            include_ascii: true,
            include_text: true,
            ..Default::default()
        }
    ).await.expect("Processing failed");

    // Verify all formats present
    assert!(result.latex.contains(r"\frac"), "Should have LaTeX fraction");
    assert!(result.mathml.is_some(), "Should have MathML");
    assert!(result.ascii.is_some(), "Should have ASCII representation");
    assert!(result.text.is_some(), "Should have text representation");

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_pipeline_caching() {
    let test_server = TestServer::with_cache().await
        .expect("Failed to start test server");

    // Create test image
    let image = images::generate_simple_equation("a + b = c");
    image.save("/tmp/cached.png").unwrap();

    // First processing
    let start1 = std::time::Instant::now();
    let result1 = test_server.process_image("/tmp/cached.png", OutputFormat::LaTeX)
        .await.expect("First processing failed");
    let duration1 = start1.elapsed();

    // Second processing (should hit cache)
    let start2 = std::time::Instant::now();
    let result2 = test_server.process_image("/tmp/cached.png", OutputFormat::LaTeX)
        .await.expect("Second processing failed");
    let duration2 = start2.elapsed();

    // Verify cache hit
    assert_eq!(result1.latex, result2.latex, "Results should match");
    assert!(duration2 < duration1, "Cached request should be faster");
    assert!(duration2.as_millis() < 50, "Cache hit should be very fast");

    test_server.shutdown().await;
}

// Helper types
#[derive(Debug, Clone)]
pub enum OutputFormat {
    LaTeX,
    MathML,
    HTML,
    ASCII,
    All,
}

#[derive(Debug, Clone, Default)]
pub struct ProcessingOptions {
    pub enable_preprocessing: bool,
    pub enable_denoising: bool,
    pub enable_deskew: bool,
    pub include_latex: bool,
    pub include_mathml: bool,
    pub include_ascii: bool,
    pub include_text: bool,
}

#[derive(Debug, Clone)]
pub struct ProcessingResult {
    pub latex: String,
    pub mathml: Option<String>,
    pub html: Option<String>,
    pub ascii: Option<String>,
    pub text: Option<String>,
    pub confidence: f32,
    pub processing_time_ms: u64,
}
