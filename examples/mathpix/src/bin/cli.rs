use anyhow::Result;
use clap::Parser;
use ruvector_mathpix::cli::{Cli, Commands};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // Initialize logging based on verbosity
    let log_level = if cli.quiet {
        tracing::Level::ERROR
    } else if cli.verbose {
        tracing::Level::DEBUG
    } else {
        tracing::Level::INFO
    };

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| format!("{}={}", env!("CARGO_PKG_NAME"), log_level).into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Execute the command
    match cli.command {
        Commands::Ocr(args) => {
            ruvector_mathpix::cli::commands::ocr::execute(args, &cli).await?;
        }
        Commands::Batch(args) => {
            ruvector_mathpix::cli::commands::batch::execute(args, &cli).await?;
        }
        Commands::Serve(args) => {
            ruvector_mathpix::cli::commands::serve::execute(args, &cli).await?;
        }
        Commands::Config(args) => {
            ruvector_mathpix::cli::commands::config::execute(args, &cli).await?;
        }
        Commands::Version => {
            println!("mathpix-cli v{}", env!("CARGO_PKG_VERSION"));
            println!("A Rust-based CLI for Mathpix OCR processing");
        }
        Commands::Completions { shell } => {
            use clap::CommandFactory;
            use clap_complete::{generate, Shell};

            let shell = shell.unwrap_or_else(|| {
                Shell::from_env().unwrap_or(Shell::Bash)
            });

            let mut cmd = Cli::command();
            let bin_name = cmd.get_name().to_string();
            generate(shell, &mut cmd, bin_name, &mut std::io::stdout());
        }
    }

    Ok(())
}
