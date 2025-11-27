import { Command } from 'commander';
import { ConsensusOperations } from '../../core/consensus';
import { formatOutput, withSpinner } from '../utils/output';

export function registerConsensusCommands(program: Command): void {
  const consensus = program
    .command('consensus')
    .description('DAG consensus operations (submit, finalize, order)');

  // Submit transaction
  consensus
    .command('submit')
    .description('Submit a transaction to the DAG')
    .option('-d, --data <json>', 'Transaction data as JSON', parseJSON)
    .option('-p, --parents <ids...>', 'Parent transaction IDs')
    .option('-t, --type <type>', 'Transaction type', 'write')
    .action(async (options, command) => {
      await withSpinner('Submitting transaction', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ConsensusOperations(globalOpts);

        const result = await ops.submit({
          data: options.data,
          parents: options.parents || [],
          type: options.type,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Finalize vertices
  consensus
    .command('finalize')
    .description('Finalize vertices in the DAG')
    .option('-i, --ids <ids...>', 'Vertex IDs to finalize')
    .option('--threshold <n>', 'Finalization threshold', '0.67')
    .action(async (options, command) => {
      await withSpinner('Finalizing vertices', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ConsensusOperations(globalOpts);

        const result = await ops.finalize({
          ids: options.ids || [],
          threshold: parseFloat(options.threshold),
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Get order
  consensus
    .command('order')
    .description('Get total order of finalized transactions')
    .option('-f, --from <id>', 'Start from transaction ID')
    .option('-l, --limit <n>', 'Limit number of results', '100')
    .action(async (options, command) => {
      await withSpinner('Fetching order', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ConsensusOperations(globalOpts);

        const result = await ops.getOrder({
          from: options.from,
          limit: parseInt(options.limit),
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Consensus stats
  consensus
    .command('stats')
    .description('Get consensus statistics')
    .option('--detailed', 'Show detailed stats', false)
    .action(async (options, command) => {
      await withSpinner('Fetching consensus stats', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ConsensusOperations(globalOpts);

        const result = await ops.stats({
          detailed: options.detailed,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Prune vertices
  consensus
    .command('prune')
    .description('Prune old vertices from the DAG')
    .option('--before <timestamp>', 'Prune vertices before timestamp')
    .option('--keep <n>', 'Keep last N vertices', '10000')
    .action(async (options, command) => {
      await withSpinner('Pruning vertices', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ConsensusOperations(globalOpts);

        const result = await ops.prune({
          before: options.before ? new Date(options.before) : undefined,
          keep: parseInt(options.keep),
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Detect conflicts
  consensus
    .command('conflicts')
    .description('Detect conflicts in the DAG')
    .option('-i, --id <id>', 'Check conflicts for specific transaction')
    .option('--resolve', 'Auto-resolve conflicts', false)
    .action(async (options, command) => {
      await withSpinner('Detecting conflicts', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ConsensusOperations(globalOpts);

        const result = await ops.detectConflicts({
          id: options.id,
          resolve: options.resolve,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Vector clock
  consensus
    .command('clock')
    .description('Show vector clock information')
    .option('-n, --node <id>', 'Node ID (shows all if not specified)')
    .action(async (options, command) => {
      await withSpinner('Fetching clock info', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ConsensusOperations(globalOpts);

        const result = await ops.clockInfo({
          nodeId: options.node,
        });

        formatOutput(result, globalOpts.format);
      });
    });
}

function parseJSON(value: string): any {
  try {
    return JSON.parse(value);
  } catch (e) {
    throw new Error(`Invalid JSON: ${value}`);
  }
}
