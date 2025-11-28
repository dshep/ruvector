// Cache integration tests
//
// Tests caching behavior, hit/miss ratios, similarity search, and persistence

use super::*;
use tokio;

#[tokio::test]
async fn test_cache_hit_miss_behavior() {
    let test_server = TestServer::with_cache().await
        .expect("Failed to start test server with cache");

    let image = images::generate_simple_equation("x^2");
    image.save("/tmp/cache_test_1.png").unwrap();

    // First request - should miss cache
    let start1 = std::time::Instant::now();
    let result1 = test_server.process_image("/tmp/cache_test_1.png", OutputFormat::LaTeX)
        .await
        .expect("Processing failed");
    let duration1 = start1.elapsed();

    // Get cache stats
    let stats = test_server.cache_stats().await.expect("Failed to get cache stats");
    assert_eq!(stats.hits, 0, "Should have 0 hits");
    assert_eq!(stats.misses, 1, "Should have 1 miss");

    // Second request - should hit cache
    let start2 = std::time::Instant::now();
    let result2 = test_server.process_image("/tmp/cache_test_1.png", OutputFormat::LaTeX)
        .await
        .expect("Processing failed");
    let duration2 = start2.elapsed();

    // Verify results match
    assert_eq!(result1.latex, result2.latex, "Cached result should match");

    // Cached request should be faster
    assert!(duration2 < duration1 / 2, "Cache hit should be significantly faster");

    // Get updated stats
    let stats = test_server.cache_stats().await.expect("Failed to get cache stats");
    assert_eq!(stats.hits, 1, "Should have 1 hit");
    assert_eq!(stats.misses, 1, "Should still have 1 miss");

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_cache_similarity_lookup() {
    let test_server = TestServer::with_cache().await
        .expect("Failed to start test server");

    // Create original image
    let image1 = images::generate_simple_equation("a + b");
    image1.save("/tmp/similarity_1.png").unwrap();

    // Create similar image (slightly different rendering)
    let mut image2 = images::generate_simple_equation("a + b");
    images::add_slight_variation(&mut image2, 0.05);
    image2.save("/tmp/similarity_2.png").unwrap();

    // Process first image
    let result1 = test_server.process_image("/tmp/similarity_1.png", OutputFormat::LaTeX)
        .await
        .expect("Processing failed");

    // Process similar image
    let start = std::time::Instant::now();
    let result2 = test_server.process_image("/tmp/similarity_2.png", OutputFormat::LaTeX)
        .await
        .expect("Processing failed");
    let duration = start.elapsed();

    // Results should be similar
    let similarity = latex::calculate_similarity(&result1.latex, &result2.latex);
    assert!(similarity > 0.9, "Similar images should produce similar results");

    // If similarity threshold is met, second request should be fast
    if similarity > 0.95 {
        assert!(duration.as_millis() < 100, "Should use similarity cache");
    }

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_cache_eviction() {
    // Start server with small cache size
    let test_server = TestServer::with_cache_size(3).await
        .expect("Failed to start test server");

    // Create and process 5 different images
    for i in 0..5 {
        let eq = format!("x + {}", i);
        let image = images::generate_simple_equation(&eq);
        let path = format!("/tmp/eviction_{}.png", i);
        image.save(&path).unwrap();

        test_server.process_image(&path, OutputFormat::LaTeX)
            .await
            .expect("Processing failed");
    }

    // Get cache stats
    let stats = test_server.cache_stats().await.expect("Failed to get cache stats");
    assert_eq!(stats.misses, 5, "Should have 5 misses");
    assert_eq!(stats.evictions > 0, true, "Should have evictions");
    assert!(stats.current_size <= 3, "Cache should not exceed max size");

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_cache_persistence() {
    let cache_dir = "/tmp/mathpix_cache_persist";
    std::fs::create_dir_all(cache_dir).unwrap();

    // Start server with persistent cache
    let test_server = TestServer::with_persistent_cache(cache_dir).await
        .expect("Failed to start test server");

    // Process image
    let image = images::generate_simple_equation("persistent");
    image.save("/tmp/persist_test.png").unwrap();

    let result1 = test_server.process_image("/tmp/persist_test.png", OutputFormat::LaTeX)
        .await
        .expect("Processing failed");

    // Shutdown server
    test_server.shutdown().await;

    // Start new server with same cache directory
    let test_server2 = TestServer::with_persistent_cache(cache_dir).await
        .expect("Failed to start second test server");

    // Process same image - should hit persistent cache
    let start = std::time::Instant::now();
    let result2 = test_server2.process_image("/tmp/persist_test.png", OutputFormat::LaTeX)
        .await
        .expect("Processing failed");
    let duration = start.elapsed();

    // Results should match
    assert_eq!(result1.latex, result2.latex, "Persistent cache should restore results");

    // Should be fast (cache hit)
    assert!(duration.as_millis() < 100, "Persistent cache hit should be fast");

    test_server2.shutdown().await;
}

#[tokio::test]
async fn test_cache_invalidation() {
    let test_server = TestServer::with_cache().await
        .expect("Failed to start test server");

    // Process image
    let image = images::generate_simple_equation("invalidate");
    image.save("/tmp/invalidate_test.png").unwrap();

    let result1 = test_server.process_image("/tmp/invalidate_test.png", OutputFormat::LaTeX)
        .await
        .expect("Processing failed");

    // Invalidate cache
    test_server.invalidate_cache().await.expect("Cache invalidation failed");

    // Process again - should miss cache
    let start = std::time::Instant::now();
    let result2 = test_server.process_image("/tmp/invalidate_test.png", OutputFormat::LaTeX)
        .await
        .expect("Processing failed");
    let duration = start.elapsed();

    // Results should match but processing should take time
    assert_eq!(result1.latex, result2.latex, "Results should still match");
    assert!(duration.as_millis() > 50, "Should reprocess after invalidation");

    let stats = test_server.cache_stats().await.expect("Failed to get cache stats");
    assert_eq!(stats.hits, 1, "Should have 1 hit (before invalidation)");
    assert_eq!(stats.misses, 2, "Should have 2 misses (after invalidation)");

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_cache_hit_ratio() {
    let test_server = TestServer::with_cache().await
        .expect("Failed to start test server");

    // Create test images
    let equations = vec!["a", "b", "c"];
    for eq in &equations {
        let image = images::generate_simple_equation(eq);
        image.save(&format!("/tmp/ratio_{}.png", eq)).unwrap();
    }

    // Process each image twice
    for eq in &equations {
        let path = format!("/tmp/ratio_{}.png", eq);

        // First time (miss)
        test_server.process_image(&path, OutputFormat::LaTeX)
            .await
            .expect("Processing failed");

        // Second time (hit)
        test_server.process_image(&path, OutputFormat::LaTeX)
            .await
            .expect("Processing failed");
    }

    // Get stats
    let stats = test_server.cache_stats().await.expect("Failed to get cache stats");

    // Calculate hit ratio
    let total_requests = stats.hits + stats.misses;
    let hit_ratio = stats.hits as f64 / total_requests as f64;

    assert_eq!(stats.hits, 3, "Should have 3 hits");
    assert_eq!(stats.misses, 3, "Should have 3 misses");
    assert!((hit_ratio - 0.5).abs() < 0.01, "Hit ratio should be ~50%");

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_cache_ttl_expiration() {
    // Start server with 1-second TTL
    let test_server = TestServer::with_cache_ttl(1).await
        .expect("Failed to start test server");

    // Process image
    let image = images::generate_simple_equation("ttl");
    image.save("/tmp/ttl_test.png").unwrap();

    let result1 = test_server.process_image("/tmp/ttl_test.png", OutputFormat::LaTeX)
        .await
        .expect("Processing failed");

    // Immediately reprocess - should hit cache
    let start = std::time::Instant::now();
    let result2 = test_server.process_image("/tmp/ttl_test.png", OutputFormat::LaTeX)
        .await
        .expect("Processing failed");
    let duration1 = start.elapsed();

    assert_eq!(result1.latex, result2.latex);
    assert!(duration1.as_millis() < 50, "Should hit cache");

    // Wait for TTL to expire
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    // Reprocess - should miss cache
    let start = std::time::Instant::now();
    let result3 = test_server.process_image("/tmp/ttl_test.png", OutputFormat::LaTeX)
        .await
        .expect("Processing failed");
    let duration2 = start.elapsed();

    assert_eq!(result1.latex, result3.latex);
    assert!(duration2.as_millis() > 50, "Should miss cache after TTL");

    test_server.shutdown().await;
}

#[tokio::test]
async fn test_cache_concurrent_access() {
    let test_server = TestServer::with_cache().await
        .expect("Failed to start test server");

    let image = images::generate_simple_equation("concurrent");
    image.save("/tmp/concurrent_cache.png").unwrap();

    // First request to populate cache
    test_server.process_image("/tmp/concurrent_cache.png", OutputFormat::LaTeX)
        .await
        .expect("Processing failed");

    // Spawn multiple concurrent requests
    let mut handles = vec![];
    for _ in 0..10 {
        let server = test_server.clone();
        let handle = tokio::spawn(async move {
            server.process_image("/tmp/concurrent_cache.png", OutputFormat::LaTeX)
                .await
        });
        handles.push(handle);
    }

    // Wait for all to complete
    let results = futures::future::join_all(handles).await;

    // All should succeed and return same result
    assert!(results.iter().all(|r| r.is_ok()), "All requests should succeed");

    let first_latex = &results[0].as_ref().unwrap().as_ref().unwrap().latex;
    assert!(results.iter().all(|r| {
        &r.as_ref().unwrap().as_ref().unwrap().latex == first_latex
    }), "All results should match");

    // Most should be cache hits
    let stats = test_server.cache_stats().await.expect("Failed to get cache stats");
    assert!(stats.hits >= 9, "Most concurrent requests should hit cache");

    test_server.shutdown().await;
}

// Cache statistics structure
#[derive(Debug, Clone)]
pub struct CacheStats {
    pub hits: u64,
    pub misses: u64,
    pub evictions: u64,
    pub current_size: usize,
    pub max_size: usize,
}
