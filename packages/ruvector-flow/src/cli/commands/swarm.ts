import { Command } from 'commander';
import { SwarmOrchestration } from '../../swarm/coordinator';
import { formatOutput, withSpinner } from '../utils/output';

export function registerSwarmCommands(program: Command): void {
  const swarm = program
    .command('swarm')
    .description('Swarm orchestration (init, agents, tasks, memory)');

  // Initialize swarm
  swarm
    .command('init')
    .description('Initialize a swarm coordination system')
    .option('-t, --topology <type>', 'Topology (hierarchical|mesh|adaptive|collective)', 'mesh')
    .option('-a, --max-agents <n>', 'Maximum number of agents', '10')
    .option('-m, --memory-backend <backend>', 'Memory backend (agentdb|redis|local)', 'agentdb')
    .option('-n, --name <name>', 'Swarm name', 'default-swarm')
    .action(async (options, command) => {
      await withSpinner('Initializing swarm', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new SwarmOrchestration(globalOpts);

        const result = await ops.init({
          topology: options.topology,
          maxAgents: parseInt(options.maxAgents),
          memoryBackend: options.memoryBackend,
          name: options.name,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Swarm status
  swarm
    .command('status')
    .description('Get swarm status')
    .option('-n, --name <name>', 'Swarm name', 'default-swarm')
    .option('--detailed', 'Show detailed status', false)
    .action(async (options, command) => {
      await withSpinner('Fetching swarm status', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new SwarmOrchestration(globalOpts);

        const result = await ops.status({
          name: options.name,
          detailed: options.detailed,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Scale swarm
  swarm
    .command('scale')
    .description('Scale swarm to target agent count')
    .argument('<count>', 'Target agent count', parseInt)
    .option('-n, --name <name>', 'Swarm name', 'default-swarm')
    .action(async (count, options, command) => {
      await withSpinner('Scaling swarm', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new SwarmOrchestration(globalOpts);

        const result = await ops.scale(count, {
          name: options.name,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Agent management
  const agent = swarm
    .command('agent')
    .description('Manage swarm agents');

  agent
    .command('spawn')
    .description('Spawn a new agent')
    .option('-t, --type <type>', 'Agent type (coder|researcher|tester|reviewer)', 'coder')
    .option('-r, --role <role>', 'Agent role/description')
    .option('-c, --capabilities <caps...>', 'Agent capabilities')
    .option('-n, --name <name>', 'Agent name (auto-generated if not provided)')
    .option('-s, --swarm <swarm>', 'Swarm name', 'default-swarm')
    .action(async (options, command) => {
      await withSpinner('Spawning agent', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new SwarmOrchestration(globalOpts);

        const result = await ops.spawnAgent({
          type: options.type,
          role: options.role,
          capabilities: options.capabilities || [],
          name: options.name,
          swarmName: options.swarm,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  agent
    .command('list')
    .description('List all agents in swarm')
    .option('-s, --swarm <swarm>', 'Swarm name', 'default-swarm')
    .option('-f, --filter <type>', 'Filter by agent type')
    .action(async (options, command) => {
      await withSpinner('Fetching agents', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new SwarmOrchestration(globalOpts);

        const result = await ops.listAgents({
          swarmName: options.swarm,
          filter: options.filter,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  agent
    .command('metrics')
    .description('Get agent performance metrics')
    .argument('<agent-id>', 'Agent ID')
    .option('-p, --period <period>', 'Time period (1h|24h|7d)', '1h')
    .action(async (agentId, options, command) => {
      await withSpinner('Fetching agent metrics', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new SwarmOrchestration(globalOpts);

        const result = await ops.agentMetrics(agentId, {
          period: options.period,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  // Task orchestration
  const task = swarm
    .command('task')
    .description('Manage swarm tasks');

  task
    .command('orchestrate')
    .description('Orchestrate a task across agents')
    .option('-d, --description <desc>', 'Task description', { required: true })
    .option('-a, --agents <ids...>', 'Assigned agent IDs')
    .option('-p, --priority <level>', 'Priority level (low|medium|high|critical)', 'medium')
    .option('-t, --timeout <ms>', 'Task timeout in milliseconds', '300000')
    .option('-s, --swarm <swarm>', 'Swarm name', 'default-swarm')
    .action(async (options, command) => {
      await withSpinner('Orchestrating task', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new SwarmOrchestration(globalOpts);

        const result = await ops.orchestrateTask({
          description: options.description,
          agents: options.agents || [],
          priority: options.priority,
          timeout: parseInt(options.timeout),
          swarmName: options.swarm,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  task
    .command('status')
    .description('Get task status')
    .argument('<task-id>', 'Task ID')
    .action(async (taskId, options, command) => {
      await withSpinner('Fetching task status', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new SwarmOrchestration(globalOpts);

        const result = await ops.taskStatus(taskId);

        formatOutput(result, globalOpts.format);
      });
    });

  // Memory management
  const memory = swarm
    .command('memory')
    .description('Manage swarm shared memory');

  memory
    .command('store')
    .description('Store data in shared memory')
    .option('-k, --key <key>', 'Memory key', { required: true })
    .option('-v, --value <value>', 'Value as JSON', { required: true }, parseJSON)
    .option('-t, --ttl <seconds>', 'Time to live in seconds')
    .option('-s, --swarm <swarm>', 'Swarm name', 'default-swarm')
    .action(async (options, command) => {
      await withSpinner('Storing in memory', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new SwarmOrchestration(globalOpts);

        const result = await ops.memoryStore({
          key: options.key,
          value: options.value,
          ttl: options.ttl ? parseInt(options.ttl) : undefined,
          swarmName: options.swarm,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  memory
    .command('retrieve')
    .description('Retrieve data from shared memory')
    .argument('<key>', 'Memory key')
    .option('-s, --swarm <swarm>', 'Swarm name', 'default-swarm')
    .action(async (key, options, command) => {
      await withSpinner('Retrieving from memory', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new SwarmOrchestration(globalOpts);

        const result = await ops.memoryRetrieve(key, {
          swarmName: options.swarm,
        });

        formatOutput(result, globalOpts.format);
      });
    });

  memory
    .command('usage')
    .description('Get memory usage statistics')
    .option('-s, --swarm <swarm>', 'Swarm name', 'default-swarm')
    .action(async (options, command) => {
      await withSpinner('Fetching memory usage', async () => {
        const globalOpts = command.optsWithGlobals();
        const ops = new SwarmOrchestration(globalOpts);

        const result = await ops.memoryUsage({
          swarmName: options.swarm,
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
