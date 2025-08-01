import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import { ConfigManager } from '../core/ConfigManager.js';
import type { Config } from '../types/index.js';

export const configCommand = new Command('config')
  .description('Manage sub-agents configuration')
  .option('-s, --set <key=value>', 'Set a configuration value')
  .option('-g, --get <key>', 'Get a configuration value')
  .option('-l, --list', 'List all configuration values')
  .option('-r, --reset', 'Reset configuration to defaults')
  .option('-p, --path', 'Show configuration file path')
  .option('-i, --interactive', 'Interactive configuration mode')
  .action(async (options) => {
    const configManager = new ConfigManager();

    // Show config path
    if (options.path) {
      console.log(chalk.gray('Configuration file path:'));
      console.log(configManager.getConfigPath());
      return;
    }

    // Reset configuration
    if (options.reset) {
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to reset all configuration to defaults?',
          default: false,
        },
      ]);

      if (answers.confirm) {
        configManager.reset();
        console.log(chalk.green('✓ Configuration reset to defaults'));
      } else {
        console.log(chalk.yellow('Reset cancelled'));
      }
      return;
    }

    // Interactive mode
    if (options.interactive) {
      const currentConfig = configManager.getAll();
      
      const questions = [
        {
          type: 'input',
          name: 'installPath',
          message: 'Default install path:',
          default: currentConfig.installPath,
        },
        {
          type: 'confirm',
          name: 'autoUpdate',
          message: 'Enable automatic updates?',
          default: currentConfig.autoUpdate,
        },
        {
          type: 'confirm',
          name: 'telemetry',
          message: 'Enable anonymous usage telemetry?',
          default: currentConfig.telemetry,
        },
        {
          type: 'input',
          name: 'registry',
          message: 'Agent registry URL:',
          default: currentConfig.registry,
        },
        {
          type: 'confirm',
          name: 'backupBeforeInstall',
          message: 'Create backups before installing agents?',
          default: currentConfig.backupBeforeInstall,
        },
        {
          type: 'confirm',
          name: 'colorOutput',
          message: 'Enable colored output?',
          default: currentConfig.colorOutput,
        },
        {
          type: 'confirm',
          name: 'preferGlobal',
          message: 'Prefer global installations by default?',
          default: currentConfig.preferGlobal,
        },
      ];

      const answers = await inquirer.prompt(questions);
      
      Object.entries(answers).forEach(([key, value]) => {
        configManager.set(key as keyof Config, value as any);
      });

      console.log(chalk.green('\n✓ Configuration updated successfully'));
      return;
    }

    // Get specific value
    if (options.get) {
      const key = options.get as keyof Config;
      
      if (!configManager.has(key)) {
        console.error(chalk.red(`Error: Unknown configuration key "${key}"`));
        console.log(chalk.yellow('\nAvailable keys:'));
        Object.keys(configManager.getAll()).forEach(k => {
          console.log(`  - ${k}`);
        });
        process.exit(1);
      }

      const value = configManager.get(key);
      console.log(value);
      return;
    }

    // Set specific value
    if (options.set) {
      const [key, ...valueParts] = options.set.split('=');
      const value = valueParts.join('=');

      if (!key || !value) {
        console.error(chalk.red('Error: Invalid format. Use key=value'));
        process.exit(1);
      }

      const typedKey = key as keyof Config;
      const currentConfig = configManager.getAll();

      if (!(typedKey in currentConfig)) {
        console.error(chalk.red(`Error: Unknown configuration key "${key}"`));
        console.log(chalk.yellow('\nAvailable keys:'));
        Object.keys(currentConfig).forEach(k => {
          console.log(`  - ${k}`);
        });
        process.exit(1);
      }

      // Parse value based on current type
      let parsedValue: any = value;
      const currentValue = currentConfig[typedKey];
      
      if (typeof currentValue === 'boolean') {
        parsedValue = value === 'true';
      } else if (typeof currentValue === 'number') {
        parsedValue = parseInt(value, 10);
        if (isNaN(parsedValue)) {
          console.error(chalk.red(`Error: "${key}" must be a number`));
          process.exit(1);
        }
      }

      configManager.set(typedKey, parsedValue);
      console.log(chalk.green(`✓ Set ${key} = ${parsedValue}`));
      return;
    }

    // List all configuration (default)
    const config = configManager.getAll();
    
    console.log(chalk.bold('\nCurrent Configuration:\n'));

    const table = new Table({
      head: [chalk.cyan('Key'), chalk.cyan('Value'), chalk.cyan('Type')],
      style: {
        head: [],
        border: [],
      },
    });

    Object.entries(config).forEach(([key, value]) => {
      table.push([
        chalk.green(key),
        chalk.yellow(String(value)),
        chalk.gray(typeof value),
      ]);
    });

    console.log(table.toString());
    console.log(chalk.gray(`\nConfiguration file: ${configManager.getConfigPath()}`));
  });