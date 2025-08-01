import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import { join } from 'path';
import { AgentManager } from '../core/AgentManager.js';

export const validateCommand = new Command('validate')
  .description('Validate agent definition files')
  .option('-a, --agent <name>', 'Validate a specific agent')
  .option('--all', 'Validate all agents')
  .option('-p, --path <path>', 'Path to agent file or directory')
  .option('--strict', 'Enable strict validation mode')
  .action(async (options) => {
    const agentManager = new AgentManager();
    await agentManager.initialize();

    let filesToValidate: string[] = [];

    if (options.path) {
      // Validate specific path
      const files = await glob(join(options.path, '**/*.md'));
      filesToValidate = files;
    } else if (options.agent) {
      // Validate specific agent
      const agent = await agentManager.getAgent(options.agent);
      if (!agent) {
        console.error(chalk.red(`Error: Agent "${options.agent}" not found`));
        process.exit(1);
      }
      filesToValidate = [agent.path];
    } else if (options.all) {
      // Validate all agents
      const agents = await agentManager.listAgents();
      filesToValidate = agents.map(a => a.path);
    } else {
      console.error(chalk.red('Error: Please specify an agent, path, or use --all'));
      console.log(chalk.yellow('\nExamples:'));
      console.log('  sub-agents validate --agent=nextjs-developer');
      console.log('  sub-agents validate --path=./my-agents');
      console.log('  sub-agents validate --all');
      process.exit(1);
    }

    if (filesToValidate.length === 0) {
      console.log(chalk.yellow('No agent files found to validate.'));
      return;
    }

    console.log(chalk.bold(`\nValidating ${filesToValidate.length} agent file(s)...\n`));

    const results = {
      valid: [] as string[],
      invalid: [] as { path: string; errors: string[]; warnings: string[] }[],
    };

    for (const filePath of filesToValidate) {
      const spinner = ora(`Validating ${filePath}...`).start();

      const validation = await agentManager.validateAgent(filePath);

      if (validation.valid && (!options.strict || validation.warnings.length === 0)) {
        spinner.succeed(`Valid: ${validation.agent?.name || filePath}`);
        results.valid.push(filePath);
      } else {
        spinner.fail(`Invalid: ${validation.agent?.name || filePath}`);
        results.invalid.push({
          path: filePath,
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }
    }

    // Summary
    console.log(chalk.bold('\n=== Validation Summary ===\n'));

    if (results.valid.length > 0) {
      console.log(chalk.green(`✓ Valid: ${results.valid.length} agent(s)`));
    }

    if (results.invalid.length > 0) {
      console.log(chalk.red(`✗ Invalid: ${results.invalid.length} agent(s)\n`));

      for (const { path, errors, warnings } of results.invalid) {
        console.log(chalk.bold(`\n${path}:`));
        
        if (errors.length > 0) {
          console.log(chalk.red('  Errors:'));
          errors.forEach(error => console.log(chalk.red(`    - ${error}`)));
        }
        
        if (warnings.length > 0) {
          console.log(chalk.yellow('  Warnings:'));
          warnings.forEach(warning => console.log(chalk.yellow(`    - ${warning}`)));
        }
      }
    }

    // Exit with error if any validations failed
    if (results.invalid.length > 0) {
      process.exit(1);
    }
  });