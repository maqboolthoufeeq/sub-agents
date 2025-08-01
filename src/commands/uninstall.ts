import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { AgentManager } from '../core/AgentManager.js';

export const uninstallCommand = new Command('uninstall')
  .description('Uninstall agents')
  .option('-a, --agents <names...>', 'Uninstall specific agents')
  .option('-i, --interactive', 'Interactive uninstallation mode')
  .action(async (options) => {
    const agentManager = new AgentManager();
    await agentManager.initialize();

    let agentsToUninstall: string[] = [];

    // Interactive mode
    if (options.interactive) {
      const installedAgents = await agentManager.listAgents({ installed: true });
      
      if (installedAgents.length === 0) {
        console.log(chalk.yellow('No installed agents to uninstall.'));
        return;
      }

      const choices = installedAgents.map(agent => ({
        name: `${agent.name} (${agent.category}) - ${agent.description}`,
        value: agent.name,
        short: agent.name,
      }));

      const answers = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'agents',
          message: 'Select agents to uninstall:',
          choices,
          pageSize: 15,
        },
      ]);

      if (answers.agents.length > 0) {
        const confirm = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: `Are you sure you want to uninstall ${answers.agents.length} agent(s)?`,
            default: false,
          },
        ]);

        if (!confirm.proceed) {
          console.log(chalk.yellow('Uninstallation cancelled.'));
          return;
        }
      }

      agentsToUninstall = answers.agents;
    } 
    // Agent-based uninstallation
    else if (options.agents) {
      agentsToUninstall = options.agents;
    } 
    else {
      console.error(chalk.red('Error: Please specify agents or use interactive mode'));
      console.log(chalk.yellow('\nExamples:'));
      console.log('  sub-agents uninstall --agents=nextjs-developer,django-developer');
      console.log('  sub-agents uninstall --interactive');
      process.exit(1);
    }

    if (agentsToUninstall.length === 0) {
      console.log(chalk.yellow('No agents selected for uninstallation.'));
      return;
    }

    console.log(chalk.bold(`\nUninstalling ${agentsToUninstall.length} agent(s)...\n`));

    const results = {
      success: [] as string[],
      failed: [] as { name: string; error: string }[],
    };

    for (const agentName of agentsToUninstall) {
      const spinner = ora(`Uninstalling ${agentName}...`).start();

      try {
        await agentManager.uninstallAgent(agentName);
        spinner.succeed(`Uninstalled ${agentName}`);
        results.success.push(agentName);
      } catch (error: any) {
        spinner.fail(`Failed to uninstall ${agentName}: ${error.message}`);
        results.failed.push({ name: agentName, error: error.message });
      }
    }

    // Summary
    console.log(chalk.bold('\n=== Uninstallation Summary ===\n'));
    
    if (results.success.length > 0) {
      console.log(chalk.green(`✓ Successfully uninstalled: ${results.success.length} agent(s)`));
      results.success.forEach(name => console.log(chalk.green(`  - ${name}`)));
    }
    
    if (results.failed.length > 0) {
      console.log(chalk.red(`✗ Failed: ${results.failed.length} agent(s)`));
      results.failed.forEach(({ name, error }) => 
        console.log(chalk.red(`  - ${name}: ${error}`))
      );
    }

    // Exit with error if any uninstallations failed
    if (results.failed.length > 0) {
      process.exit(1);
    }
  });