#!/usr/bin/env node

import { Command } from 'commander';
import { registerVectorCommands } from './commands/vector';
import { registerIndexCommands } from './commands/index';
import { registerCollectionCommands } from './commands/collection';
import { registerClusterCommands } from './commands/cluster';
import { registerConsensusCommands } from './commands/consensus';
import { registerSwarmCommands } from './commands/swarm';
import { version } from '../../package.json';

const program = new Command();

// Global program configuration
program
  .name('ruvector')
  .description('Distributed vector database with swarm orchestration')
  .version(version)
  .option('-c, --config <path>', 'Path to config file', './ruvector.config.json')
  .option('-f, --format <type>', 'Output format (json|table|plain)', 'table')
  .option('-v, --verbose', 'Verbose output', false)
  .option('--endpoint <url>', 'RUVector endpoint URL', 'http://localhost:6333')
  .option('--api-key <key>', 'API key for authentication');

// Register all command groups
registerVectorCommands(program);
registerIndexCommands(program);
registerCollectionCommands(program);
registerClusterCommands(program);
registerConsensusCommands(program);
registerSwarmCommands(program);

// Global error handler
program.exitOverride();
program.showHelpAfterError('(add --help for additional information)');

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
