import { Command } from 'commander';
import { IndexManagement } from '../../core/index';
import { formatOutput, withSpinner } from '../utils/output';

export function registerIndexCommands(program: Command): void {
  const index = program
    .command('index')
    .description('Index management (create, build, optimize, stats)');

  // Create HNSW index
  const create = index
    .command('create')
    .description('Create a new index');

  create
    .command('hnsw')
    .description('Create HNSW (Hierarchical Navigable Small World) index')
    .argument('<collection>', 'Collection name')
    .option('-m, --m <m>', 'Number of connections per layer', '16')
    .option('-e, --ef-construct <ef>', 'Size of dynamic candidate list', '200')
    .option('-d, --distance <metric>', 'Distance metric (cosine|euclidean|dot)', 'cosine')
    .option('--on-disk', 'Store index on disk', false)
    .action(async (collection, options, command) => {
      await withSpinner('Creating HNSW index', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new IndexManagement(globalOpts);

        const result = await ops.createHNSW(collection, {
          m: parseInt(options.m),
          efConstruct: parseInt(options.efConstruct),
          distance: options.distance,
          onDisk: options.onDisk,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  create
    .command('flat')
    .description('Create flat (brute force) index')
    .argument('<collection>', 'Collection name')
    .option('-d, --distance <metric>', 'Distance metric (cosine|euclidean|dot)', 'cosine')
    .action(async (collection, options, command) => {
      await withSpinner('Creating flat index', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new IndexManagement(globalOpts);

        const result = await ops.createFlat(collection, {
          distance: options.distance,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Build index
  index
    .command('build')
    .description('Build or rebuild index from vectors')
    .argument('<collection>', 'Collection name')
    .option('-t, --threads <threads>', 'Number of build threads', '0')
    .option('--force', 'Force rebuild even if index exists', false)
    .action(async (collection, options, command) => {
      await withSpinner('Building index', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new IndexManagement(globalOpts);

        const result = await ops.build(collection, {
          threads: parseInt(options.threads),
          force: options.force,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Index stats
  index
    .command('stats')
    .description('Get index statistics')
    .argument('<collection>', 'Collection name')
    .action(async (collection, options, command) => {
      await withSpinner('Fetching index stats', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new IndexManagement(globalOpts);

        const result = await ops.stats(collection);

        formatOutput(result, globalOpts.format);
      });
    });

  // Optimize index
  index
    .command('optimize')
    .description('Optimize index for better performance')
    .argument('<collection>', 'Collection name')
    .option('-t, --target-segments <n>', 'Target number of segments', '1')
    .option('--vacuum', 'Remove deleted vectors', true)
    .action(async (collection, options, command) => {
      await withSpinner('Optimizing index', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new IndexManagement(globalOpts);

        const result = await ops.optimize(collection, {
          targetSegments: parseInt(options.targetSegments),
          vacuum: options.vacuum,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Rebuild index
  index
    .command('rebuild')
    .description('Completely rebuild index from scratch')
    .argument('<collection>', 'Collection name')
    .option('-t, --threads <threads>', 'Number of rebuild threads', '0')
    .action(async (collection, options, command) => {
      await withSpinner('Rebuilding index', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new IndexManagement(globalOpts);

        const result = await ops.rebuild(collection, {
          threads: parseInt(options.threads),
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Delete index
  index
    .command('delete')
    .description('Delete an index')
    .argument('<collection>', 'Collection name')
    .option('--confirm', 'Confirm deletion', false)
    .action(async (collection, options, command) => {
      if (!options.confirm) {
        console.error('Error: Please confirm deletion with --confirm flag');
        process.exit(1);
      }

      await withSpinner('Deleting index', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new IndexManagement(globalOpts);

        const result = await ops.delete(collection);

        formatOutput(result, globalOpts.format);
      });
    });
}
