import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { CategoryManager } from '../core/CategoryManager.js';

export const categoriesCommand = new Command('categories')
  .description('List all available agent categories')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    const categoryManager = new CategoryManager();
    const categories = categoryManager.getAll();

    if (options.json) {
      console.log(JSON.stringify(categories, null, 2));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('Category'),
        chalk.cyan('Description'),
        chalk.cyan('Agent Count'),
      ],
      style: {
        head: [],
        border: [],
      },
    });

    for (const category of categories) {
      table.push([
        chalk.green(category.name),
        category.description,
        chalk.yellow(category.agents.length.toString()),
      ]);
    }

    console.log(chalk.bold('\nAvailable Categories:\n'));
    console.log(table.toString());
    console.log(chalk.gray(`\nTotal categories: ${categories.length}`));
  });