import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { AgentManager } from '../core/AgentManager.js';
import type { SearchOptions } from '../types/index.js';

export const searchCommand = new Command('search')
  .description('Search for agents')
  .argument('<query>', 'Search query')
  .option('-c, --category <name>', 'Filter by category')
  .option('-t, --tags <tags...>', 'Filter by tags')
  .option('-l, --limit <number>', 'Limit number of results', '20')
  .option('--json', 'Output in JSON format')
  .action(async (query: string, options: SearchOptions & { json?: boolean }) => {
    const agentManager = new AgentManager();
    await agentManager.initialize();

    const searchOptions: SearchOptions = {
      category: options.category,
      tags: options.tags,
      limit: parseInt(options.limit?.toString() || '20', 10),
    };

    const results = await agentManager.searchAgents(query, searchOptions);

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      console.log(chalk.yellow(`\nNo agents found matching "${query}"`));
      if (options.category || options.tags) {
        console.log(chalk.gray('Try broadening your search criteria.'));
      }
      return;
    }

    console.log(chalk.bold(`\nSearch results for "${query}":\n`));

    const table = new Table({
      head: [
        chalk.cyan('Name'),
        chalk.cyan('Category'),
        chalk.cyan('Status'),
        chalk.cyan('Description'),
        chalk.cyan('Tags'),
      ],
      style: {
        head: [],
        border: [],
      },
      colWidths: [25, 15, 12, 40, 20],
      wordWrap: true,
    });

    for (const agent of results) {
      const status = agent.installed ? chalk.green('Installed') : chalk.gray('Available');
      const tags = (agent.tags || []).slice(0, 3).join(', ');

      table.push([
        chalk.bold(agent.name),
        agent.category,
        status,
        agent.description,
        tags + (agent.tags && agent.tags.length > 3 ? '...' : ''),
      ]);
    }

    console.log(table.toString());
    console.log(chalk.gray(`\nFound ${results.length} agent(s)`));
  });