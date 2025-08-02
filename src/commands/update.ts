import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { AgentManager } from '../core/AgentManager.js';
import type { UpdateOptions } from '../types/index.js';

export const updateCommand = new Command('update')
  .description('Update installed agents')
  .option('-a, --agents <names...>', 'Update specific agents')
  .option('--all', 'Update all installed agents')
  .option('-f, --force', 'Force update even if already up to date')
  .action(async (options: UpdateOptions) => {
    const agentManager = new AgentManager();
    await agentManager.initialize();

    let agentsToUpdate: string[] = [];

    if (options.all) {
      const installedAgents = await agentManager.listAgents({ installed: true });
      agentsToUpdate = installedAgents
        .filter(agent => agent.availableUpdate || options.force)
        .map(agent => agent.name);
      
      if (agentsToUpdate.length === 0 && !options.force) {
        console.log(chalk.green('All agents are up to date!'));
        return;
      }
    } else if (options.agents) {
      agentsToUpdate = options.agents;
    } else {
      console.error(chalk.red('Error: Please specify agents or use --all'));
      console.log(chalk.yellow('\nExamples:'));
      console.log(' npx sub-agents update --agents=nextjs-developer,django-developer');
      console.log(' npx sub-agents update --all');
      process.exit(1);
    }

    if (agentsToUpdate.length === 0) {
      console.log(chalk.yellow('No agents to update.'));
      return;
    }

    console.log(chalk.bold(`\nUpdating ${agentsToUpdate.length} agent(s)...\n`));

    const results = {
      success: [] as { name: string; oldVersion: string; newVersion: string }[],
      failed: [] as { name: string; error: string }[],
      upToDate: [] as string[],
    };

    for (const agentName of agentsToUpdate) {
      const spinner = ora(`Checking ${agentName}...`).start();

      try {
        const agent = await agentManager.getAgent(agentName);
        
        if (!agent) {
          throw new Error('Agent not found');
        }

        if (!agent.installed) {
          throw new Error('Agent is not installed');
        }

        const oldVersion = agent.installedVersion || agent.version;
        
        if (!agent.availableUpdate && !options.force) {
          spinner.info(`${agentName} is already up to date (v${oldVersion})`);
          results.upToDate.push(agentName);
          continue;
        }

        spinner.text = `Updating ${agentName}...`;
        
        await agentManager.updateAgent(agentName, { force: options.force });
        
        const updatedAgent = await agentManager.getAgent(agentName);
        const newVersion = updatedAgent?.version || 'unknown';
        
        spinner.succeed(`Updated ${agentName} from v${oldVersion} to v${newVersion}`);
        results.success.push({ name: agentName, oldVersion, newVersion });
      } catch (error: any) {
        spinner.fail(`Failed to update ${agentName}: ${error.message}`);
        results.failed.push({ name: agentName, error: error.message });
      }
    }

    // Summary
    console.log(chalk.bold('\n=== Update Summary ===\n'));
    
    if (results.success.length > 0) {
      console.log(chalk.green(`✓ Successfully updated: ${results.success.length} agent(s)`));
      results.success.forEach(({ name, oldVersion, newVersion }) => 
        console.log(chalk.green(`  - ${name}: v${oldVersion} → v${newVersion}`))
      );
    }
    
    if (results.upToDate.length > 0) {
      console.log(chalk.blue(`⊘ Already up to date: ${results.upToDate.length} agent(s)`));
      results.upToDate.forEach(name => console.log(chalk.blue(`  - ${name}`)));
    }
    
    if (results.failed.length > 0) {
      console.log(chalk.red(`✗ Failed: ${results.failed.length} agent(s)`));
      results.failed.forEach(({ name, error }) => 
        console.log(chalk.red(`  - ${name}: ${error}`))
      );
    }

    // Exit with error if any updates failed
    if (results.failed.length > 0) {
      process.exit(1);
    }
  });