import { Command } from 'commander';
import { CollectionManagement } from '../../core/collection';
import { formatOutput, withSpinner } from '../utils/output';

export function registerCollectionCommands(program: Command): void {
  const collection = program
    .command('collection')
    .description('Collection management (create, delete, list, stats)');

  // Create collection
  collection
    .command('create')
    .description('Create a new collection')
    .argument('<name>', 'Collection name')
    .option('-d, --dimension <dim>', 'Vector dimension', parseInt)
    .option('-m, --distance <metric>', 'Distance metric (cosine|euclidean|dot)', 'cosine')
    .option('-s, --shard-number <n>', 'Number of shards', '1')
    .option('-r, --replication-factor <n>', 'Replication factor', '1')
    .option('--on-disk-payload', 'Store payload on disk', false)
    .option('--hnsw-m <m>', 'HNSW M parameter', '16')
    .option('--hnsw-ef-construct <ef>', 'HNSW ef_construct parameter', '200')
    .action(async (name, options, command) => {
      await withSpinner('Creating collection', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new CollectionManagement(globalOpts);

        const result = await ops.create(name, {
          dimension: options.dimension,
          distance: options.distance,
          shardNumber: parseInt(options.shardNumber),
          replicationFactor: parseInt(options.replicationFactor),
          onDiskPayload: options.onDiskPayload,
          hnsw: {
            m: parseInt(options.hnswM),
            efConstruct: parseInt(options.hnswEfConstruct),
          },
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Delete collection
  collection
    .command('delete')
    .description('Delete a collection')
    .argument('<name>', 'Collection name')
    .option('--confirm', 'Confirm deletion', false)
    .action(async (name, options, command) => {
      if (!options.confirm) {
        console.error('Error: Please confirm deletion with --confirm flag');
        process.exit(1);
      }

      await withSpinner('Deleting collection', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new CollectionManagement(globalOpts);

        const result = await ops.delete(name);

        formatOutput(result, globalOpts.format);
      });
    });

  // List collections
  collection
    .command('list')
    .description('List all collections')
    .action(async (options, command) => {
      await withSpinner('Fetching collections', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new CollectionManagement(globalOpts);

        const result = await ops.list();

        formatOutput(result, globalOpts.format);
      });
    });

  // Collection stats
  collection
    .command('stats')
    .description('Get collection statistics')
    .argument('<name>', 'Collection name')
    .action(async (name, options, command) => {
      await withSpinner('Fetching stats', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new CollectionManagement(globalOpts);

        const result = await ops.stats(name);

        formatOutput(result, globalOpts.format);
      });
    });

  // Collection info
  collection
    .command('info')
    .description('Get detailed collection information')
    .argument('<name>', 'Collection name')
    .action(async (name, options, command) => {
      await withSpinner('Fetching info', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new CollectionManagement(globalOpts);

        const result = await ops.info(name);

        formatOutput(result, globalOpts.format);
      });
    });

  // Alias commands
  const alias = collection
    .command('alias')
    .description('Manage collection aliases');

  alias
    .command('create')
    .description('Create a collection alias')
    .argument('<alias>', 'Alias name')
    .argument('<collection>', 'Collection name')
    .action(async (aliasName, collectionName, options, command) => {
      await withSpinner('Creating alias', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new CollectionManagement(globalOpts);

        const result = await ops.createAlias(aliasName, collectionName);

        formatOutput(result, globalOpts.format);
      });
    });

  alias
    .command('delete')
    .description('Delete a collection alias')
    .argument('<alias>', 'Alias name')
    .action(async (aliasName, options, command) => {
      await withSpinner('Deleting alias', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new CollectionManagement(globalOpts);

        const result = await ops.deleteAlias(aliasName);

        formatOutput(result, globalOpts.format);
      });
    });

  alias
    .command('list')
    .description('List all collection aliases')
    .action(async (options, command) => {
      await withSpinner('Fetching aliases', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new CollectionManagement(globalOpts);

        const result = await ops.listAliases();

        formatOutput(result, globalOpts.format);
      });
    });

  alias
    .command('switch')
    .description('Switch an alias to a different collection')
    .argument('<alias>', 'Alias name')
    .argument('<collection>', 'New collection name')
    .action(async (aliasName, collectionName, options, command) => {
      await withSpinner('Switching alias', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new CollectionManagement(globalOpts);

        const result = await ops.switchAlias(aliasName, collectionName);

        formatOutput(result, globalOpts.format);
      });
    });
}
