//! Example usage of Tiny Dancer neural routing system

use ruvector_tiny_dancer_core::{
    Router, RouterConfig, RoutingRequest, Candidate,
};
use std::collections::HashMap;

fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    println!("🕺 Tiny Dancer Example\n");

    // Create router with configuration
    let config = RouterConfig {
        model_path: "./models/fastgrnn.safetensors".to_string(),
        confidence_threshold: 0.85,
        max_uncertainty: 0.15,
        enable_circuit_breaker: true,
        circuit_breaker_threshold: 5,
        enable_quantization: true,
        database_path: Some("./data/routing.db".to_string()),
    };

    println!("Creating router with config:");
    println!("  - Model path: {}", config.model_path);
    println!("  - Confidence threshold: {}", config.confidence_threshold);
    println!("  - Max uncertainty: {}", config.max_uncertainty);
    println!("  - Circuit breaker: {}\n", config.enable_circuit_breaker);

    let router = Router::new(config)?;

    // Create sample candidates with different characteristics
    let candidates = vec![
        Candidate {
            id: "high-confidence-1".to_string(),
            embedding: vec![0.9; 128], // Very similar to query
            metadata: HashMap::from([
                ("category".to_string(), serde_json::Value::String("search".to_string())),
                ("source".to_string(), serde_json::Value::String("memory".to_string())),
            ]),
            created_at: chrono::Utc::now().timestamp(),
            access_count: 100,
            success_rate: 0.98,
        },
        Candidate {
            id: "medium-confidence-2".to_string(),
            embedding: vec![0.6; 128], // Moderately similar
            metadata: HashMap::from([
                ("category".to_string(), serde_json::Value::String("search".to_string())),
            ]),
            created_at: chrono::Utc::now().timestamp() - 86400, // 1 day old
            access_count: 50,
            success_rate: 0.85,
        },
        Candidate {
            id: "low-confidence-3".to_string(),
            embedding: vec![0.3; 128], // Less similar
            metadata: HashMap::from([
                ("category".to_string(), serde_json::Value::String("other".to_string())),
            ]),
            created_at: chrono::Utc::now().timestamp() - 259200, // 3 days old
            access_count: 10,
            success_rate: 0.70,
        },
    ];

    println!("Prepared {} candidates:\n", candidates.len());
    for candidate in &candidates {
        println!("  - {}", candidate.id);
        println!("    Access count: {}", candidate.access_count);
        println!("    Success rate: {:.2}", candidate.success_rate);
    }

    // Create routing request
    let request = RoutingRequest {
        query_embedding: vec![0.9; 128], // Query similar to first candidate
        candidates,
        metadata: Some(HashMap::from([
            ("category".to_string(), serde_json::Value::String("search".to_string())),
        ])),
    };

    println!("\n🔄 Routing request...\n");

    // Route the request
    let response = router.route(request)?;

    // Display results
    println!("📊 Routing Results:\n");
    println!("Inference time: {}µs", response.inference_time_us);
    println!("Feature extraction time: {}µs", response.feature_time_us);
    println!("Candidates processed: {}\n", response.candidates_processed);

    println!("Top decisions:");
    for (i, decision) in response.decisions.iter().enumerate() {
        println!("\n  {}. {}", i + 1, decision.candidate_id);
        println!("     Confidence: {:.4}", decision.confidence);
        println!("     Uncertainty: {:.4}", decision.uncertainty);
        println!("     Route to: {}",
            if decision.use_lightweight { "Lightweight model ⚡" } else { "Powerful model 🚀" });

        // Interpretation
        if decision.confidence > 0.9 && decision.uncertainty < 0.1 {
            println!("     ✅ High confidence - safe for lightweight model");
        } else if decision.confidence > 0.7 && decision.uncertainty < 0.2 {
            println!("     ⚠️  Medium confidence - consider context");
        } else {
            println!("     ❌ Low confidence - use powerful model");
        }
    }

    // Check circuit breaker status
    if let Some(is_healthy) = router.circuit_breaker_status() {
        println!("\n🔌 Circuit Breaker Status: {}",
            if is_healthy { "✅ Closed (Healthy)" } else { "⚠️  Open (Degraded)" });
    }

    // Calculate cost savings estimate
    let lightweight_count = response.decisions.iter()
        .filter(|d| d.use_lightweight)
        .count();
    let powerful_count = response.decisions.len() - lightweight_count;

    println!("\n💰 Cost Analysis:");
    println!("  - Lightweight routes: {}/{}", lightweight_count, response.decisions.len());
    println!("  - Powerful routes: {}/{}", powerful_count, response.decisions.len());

    if lightweight_count > 0 {
        let savings_percent = (lightweight_count as f64 / response.decisions.len() as f64) * 100.0;
        println!("  - Estimated cost reduction: {:.1}%", savings_percent);
    }

    Ok(())
}
