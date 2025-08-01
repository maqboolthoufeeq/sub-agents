#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Import commands
import { createInitCommand } from './commands/init.js';
import { categoriesCommand } from './commands/categories.js';
import { listCommand } from './commands/list.js';
import { installCommand } from './commands/install.js';
import { uninstallCommand } from './commands/uninstall.js';
import { updateCommand } from './commands/update.js';
import { searchCommand } from './commands/search.js';
import { infoCommand } from './commands/info.js';
import { validateCommand } from './commands/validate.js';
import { createCommand } from './commands/create.js';
import { templateCommand } from './commands/template.js';
import { configCommand } from './commands/config.js';
import { publishCommand } from './commands/publish.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

// Check for updates
updateNotifier({ pkg: packageJson }).notify();

// Create main program
const program = new Command();

program
  .name('sub-agents')
  .description('Initialize and manage specialized AI sub-agents for Claude Code in your project')
  .version(packageJson.version, '-v, --version', 'Display version number')
  .helpOption('-h, --help', 'Display help information');

// Add init as the primary command
const initCommand = createInitCommand();
program.addCommand(initCommand);

// Add other commands
program.addCommand(categoriesCommand);
program.addCommand(listCommand);
program.addCommand(installCommand);
program.addCommand(uninstallCommand);
program.addCommand(updateCommand);
program.addCommand(searchCommand);
program.addCommand(infoCommand);
program.addCommand(validateCommand);
program.addCommand(createCommand);
program.addCommand(templateCommand);
program.addCommand(configCommand);
program.addCommand(publishCommand);

// Error handling
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error: any) {
  if (error.code === 'commander.unknownCommand') {
    console.error(chalk.red(`Error: Unknown command '${error.message}'`));
    console.log(chalk.yellow('\nRun "sub-agents --help" to see available commands.'));
  } else if (error.code === 'commander.help' || error.code === 'commander.helpDisplayed') {
    // Help was displayed, exit normally
    process.exit(0);
  } else {
    console.error(chalk.red('Error:'), error.message || error);
    process.exit(1);
  }
}