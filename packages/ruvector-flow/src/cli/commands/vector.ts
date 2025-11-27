import { Command } from 'commander';
import { VectorOperations } from '../../core/vector';
import { formatOutput, withSpinner } from '../utils/output';

export function registerVectorCommands(program: Command): void {
  const vector = program
    .command('vector')
    .description('Vector operations (insert, search, delete, update)');

  // Vector insert (single)
  vector
    .command('insert')
    .description('Insert a single vector into a collection')
    .argument('<collection>', 'Collection name')
    .option('-v, --vector <values...>', 'Vector values (space-separated floats)', parseFloatArray)
    .option('-i, --id <id>', 'Vector ID (auto-generated if not provided)')
    .option('-p, --payload <json>', 'Payload as JSON string', parseJSON)
    .action(async (collection, options, command) => {
      await withSpinner('Inserting vector', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new VectorOperations(globalOpts);

        const result = await ops.insert(collection, {
          id: options.id,
          vector: options.vector,
          payload: options.payload,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Vector insert batch
  vector
    .command('insert-batch')
    .description('Insert multiple vectors at once')
    .argument('<collection>', 'Collection name')
    .option('-f, --file <path>', 'JSON file with vectors array')
    .option('-b, --batch-size <size>', 'Batch size for chunking', '100')
    .action(async (collection, options, command) => {
      await withSpinner('Inserting batch', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new VectorOperations(globalOpts);

        const vectors = options.file ? require(options.file) : [];
        const result = await ops.insertBatch(collection, vectors, {
          batchSize: parseInt(options.batchSize),
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Vector search
  vector
    .command('search')
    .description('Search for similar vectors (k-NN)')
    .argument('<collection>', 'Collection name')
    .option('-v, --vector <values...>', 'Query vector (space-separated floats)', parseFloatArray)
    .option('-k, --limit <k>', 'Number of results to return', '10')
    .option('-f, --filter <json>', 'Filter conditions as JSON', parseJSON)
    .option('-s, --score-threshold <score>', 'Minimum similarity score', parseFloat)
    .option('--with-payload', 'Include payload in results', true)
    .option('--with-vector', 'Include vectors in results', false)
    .action(async (collection, options, command) => {
      await withSpinner('Searching vectors', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new VectorOperations(globalOpts);

        const result = await ops.search(collection, {
          vector: options.vector,
          limit: parseInt(options.limit),
          filter: options.filter,
          scoreThreshold: options.scoreThreshold,
          withPayload: options.withPayload,
          withVector: options.withVector,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Vector delete
  vector
    .command('delete')
    .description('Delete vectors by ID or filter')
    .argument('<collection>', 'Collection name')
    .option('-i, --ids <ids...>', 'Vector IDs to delete')
    .option('-f, --filter <json>', 'Delete by filter conditions', parseJSON)
    .action(async (collection, options, command) => {
      await withSpinner('Deleting vectors', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new VectorOperations(globalOpts);

        const result = await ops.delete(collection, {
          ids: options.ids,
          filter: options.filter,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Vector update
  vector
    .command('update')
    .description('Update vector or payload')
    .argument('<collection>', 'Collection name')
    .argument('<id>', 'Vector ID')
    .option('-v, --vector <values...>', 'New vector values', parseFloatArray)
    .option('-p, --payload <json>', 'New payload as JSON', parseJSON)
    .action(async (collection, id, options, command) => {
      await withSpinner('Updating vector', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new VectorOperations(globalOpts);

        const result = await ops.update(collection, id, {
          vector: options.vector,
          payload: options.payload,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Vector get
  vector
    .command('get')
    .description('Get vector by ID')
    .argument('<collection>', 'Collection name')
    .argument('<id>', 'Vector ID')
    .option('--with-vector', 'Include vector values', true)
    .option('--with-payload', 'Include payload', true)
    .action(async (collection, id, options, command) => {
      await withSpinner('Fetching vector', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new VectorOperations(globalOpts);

        const result = await ops.get(collection, id, {
          withVector: options.withVector,
          withPayload: options.withPayload,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Vector scroll
  vector
    .command('scroll')
    .description('Scroll/iterate through vectors')
    .argument('<collection>', 'Collection name')
    .option('-l, --limit <limit>', 'Page size', '100')
    .option('-o, --offset <offset>', 'Offset ID for pagination')
    .option('-f, --filter <json>', 'Filter conditions', parseJSON)
    .option('--with-vector', 'Include vectors', false)
    .option('--with-payload', 'Include payload', true)
    .action(async (collection, options, command) => {
      await withSpinner('Scrolling vectors', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new VectorOperations(globalOpts);

        const result = await ops.scroll(collection, {
          limit: parseInt(options.limit),
          offset: options.offset,
          filter: options.filter,
          withVector: options.withVector,
          withPayload: options.withPayload,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Vector count
  vector
    .command('count')
    .description('Count vectors in collection')
    .argument('<collection>', 'Collection name')
    .option('-f, --filter <json>', 'Count with filter', parseJSON)
    .action(async (collection, options, command) => {
      await withSpinner('Counting vectors', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new VectorOperations(globalOpts);

        const result = await ops.count(collection, {
          filter: options.filter,
        });

        formatOutput(result, globalOpts.format);
      });
    });
}

// Helper functions
function parseFloatArray(value: string): number[] {
  return value.split(',').map(v => parseFloat(v.trim()));
}

function parseJSON(value: string): any {
  try {
    return JSON.parse(value);
  } catch (e) {
    throw new Error(`Invalid JSON: ${value}`);
  }
}
