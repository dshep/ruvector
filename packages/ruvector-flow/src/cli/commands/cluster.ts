import { Command } from 'commander';
import { ClusterManagement } from '../../core/cluster';
import { formatOutput, withSpinner } from '../utils/output';

export function registerClusterCommands(program: Command): void {
  const cluster = program
    .command('cluster')
    .description('Cluster management (init, nodes, shards, health)');

  // Initialize cluster
  cluster
    .command('init')
    .description('Initialize a new cluster')
    .option('-n, --name <name>', 'Cluster name', 'ruvector-cluster')
    .option('-p, --port <port>', 'Cluster port', '6335')
    .option('-b, --bind <address>', 'Bind address', '0.0.0.0')
    .option('-s, --seed-nodes <nodes...>', 'Seed nodes for joining cluster')
    .action(async (options, command) => {
      await withSpinner('Initializing cluster', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ClusterManagement(globalOpts);

        const result = await ops.init({
          name: options.name,
          port: parseInt(options.port),
          bind: options.bind,
          seedNodes: options.seedNodes || [],
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Node management
  const node = cluster
    .command('node')
    .description('Manage cluster nodes');

  node
    .command('add')
    .description('Add a node to the cluster')
    .argument('<url>', 'Node URL (e.g., http://node2:6333)')
    .option('-i, --id <id>', 'Node ID (auto-generated if not provided)')
    .action(async (url, options, command) => {
      await withSpinner('Adding node', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ClusterManagement(globalOpts);

        const result = await ops.addNode(url, {
          id: options.id,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  node
    .command('remove')
    .description('Remove a node from the cluster')
    .argument('<id>', 'Node ID')
    .option('--force', 'Force removal even if node is unavailable', false)
    .action(async (id, options, command) => {
      await withSpinner('Removing node', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ClusterManagement(globalOpts);

        const result = await ops.removeNode(id, {
          force: options.force,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  node
    .command('list')
    .description('List all cluster nodes')
    .action(async (options, command) => {
      await withSpinner('Fetching nodes', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ClusterManagement(globalOpts);

        const result = await ops.listNodes();

        formatOutput(result, globalOpts.format);
      });
    });

  // Shard management
  const shard = cluster
    .command('shard')
    .description('Manage collection shards');

  shard
    .command('list')
    .description('List shards for a collection')
    .argument('<collection>', 'Collection name')
    .action(async (collection, options, command) => {
      await withSpinner('Fetching shards', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ClusterManagement(globalOpts);

        const result = await ops.listShards(collection);

        formatOutput(result, globalOpts.format);
      });
    });

  shard
    .command('rebalance')
    .description('Rebalance shards across cluster nodes')
    .argument('<collection>', 'Collection name')
    .option('--force', 'Force rebalancing', false)
    .action(async (collection, options, command) => {
      await withSpinner('Rebalancing shards', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ClusterManagement(globalOpts);

        const result = await ops.rebalanceShards(collection, {
          force: options.force,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Cluster stats
  cluster
    .command('stats')
    .description('Get cluster statistics')
    .action(async (options, command) => {
      await withSpinner('Fetching cluster stats', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ClusterManagement(globalOpts);

        const result = await ops.stats();

        formatOutput(result, globalOpts.format);
      });
    });

  // Cluster health
  cluster
    .command('health')
    .description('Check cluster health status')
    .option('--detailed', 'Show detailed health information', false)
    .action(async (options, command) => {
      await withSpinner('Checking cluster health', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ClusterManagement(globalOpts);

        const result = await ops.health({
          detailed: options.detailed,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Ring info
  cluster
    .command('ring')
    .description('Show hash ring information')
    .action(async (options, command) => {
      await withSpinner('Fetching ring info', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ClusterManagement(globalOpts);

        const result = await ops.ringInfo();

        formatOutput(result, globalOpts.format);
      });
    });

  // Leader election
  cluster
    .command('leader')
    .description('Show cluster leader information')
    .action(async (options, command) => {
      await withSpinner('Fetching leader info', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new ClusterManagement(globalOpts);

        const result = await ops.leaderInfo();

        formatOutput(result, globalOpts.format);
      });
    });
}
