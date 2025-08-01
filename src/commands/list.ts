import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { AgentManager } from '../core/AgentManager.js';
import type { ListOptions } from '../types/index.js';

export const listCommand = new Command('list')
  .description('List agents')
  .option('-c, --category <name>', 'Filter by category')
  .option('-i, --installed', 'Show only installed agents')
  .option('-a, --available', 'Show only available (not installed) agents')
  .option('--json', 'Output in JSON format')
  .action(async (options: ListOptions) => {
    const agentManager = new AgentManager();
    await agentManager.initialize();

    const agents = await agentManager.listAgents({
      category: options.category,
      installed: options.installed,
      available: options.available,
    });

    if (options.json) {
      console.log(JSON.stringify(agents, null, 2));
      return;
    }

    if (agents.length === 0) {
      console.log(chalk.yellow('\nNo agents found matching your criteria.'));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('Name'),
        chalk.cyan('Category'),
        chalk.cyan('Version'),
        chalk.cyan('Status'),
        chalk.cyan('Description'),
      ],
      style: {
        head: [],
        border: [],
      },
      colWidths: [25, 15, 10, 15, 50],
      wordWrap: true,
    });

    for (const agent of agents) {
      let status = agent.installed ? chalk.green('Installed') : chalk.gray('Available');
      if (agent.availableUpdate) {
        status += chalk.yellow(` (Update: ${agent.availableUpdate})`);
      }

      table.push([
        chalk.bold(agent.name),
        agent.category,
        agent.version,
        status,
        agent.description,
      ]);
    }

    console.log(chalk.bold('\nAgents:\n'));
    console.log(table.toString());
    console.log(chalk.gray(`\nTotal: ${agents.length} agents`));
  });