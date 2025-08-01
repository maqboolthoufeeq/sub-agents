import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { AgentManager } from '../core/AgentManager.js';
import { CategoryManager } from '../core/CategoryManager.js';
import { IntegrationManager } from '../core/IntegrationManager.js';
import type { InstallOptions } from '../types/index.js';

interface CategoryChoice {
  name: string;
  value: string;
  checked?: boolean;
}

interface AgentChoice {
  name: string;
  value: string;
  category: string;
  checked?: boolean;
  disabled?: string;
}

export const installCommand = new Command('install')
  .description('Install additional agents to your project')
  .option('-c, --categories <names...>', 'Install all agents from specified categories')
  .option('-a, --agents <names...>', 'Install specific agents')
  .option('-i, --interactive', 'Interactive installation mode')
  .option('-f, --force', 'Force reinstall if already installed')
  .option('-g, --global', 'Install globally instead of locally')
  .option('--skip-dependencies', 'Skip dependency checks')
  .action(async (options: InstallOptions) => {
    const agentManager = new AgentManager();
    const categoryManager = new CategoryManager();
    await agentManager.initialize();

    // Check if project is initialized
    const configPath = path.join(process.cwd(), '.claude');
    if (!await fs.pathExists(configPath)) {
      console.log(chalk.yellow('⚠️  Project not initialized with sub-agents.'));
      console.log(chalk.gray('Run "npx sub-agents init" first.\n'));
      process.exit(1);
    }

    let agentsToInstall: string[] = [];

    // Interactive mode
    if (options.interactive || (!options.categories && !options.agents)) {
      console.log(chalk.blue('\n🚀 Add more agents to your project\n'));
      
      // Load current configuration
      const configFile = path.join(configPath, 'config.json');
      let installedAgents: string[] = [];
      
      if (await fs.pathExists(configFile)) {
        const config = await fs.readJson(configFile);
        installedAgents = config.agents || [];
      }

      let continueSelection = true;
      const categories = categoryManager.getAll();
      
      while (continueSelection) {
        // Step 1: Select categories
        const categoryChoices: CategoryChoice[] = categories.map(cat => ({
          name: `${cat.name} - ${cat.description}`,
          value: cat.name,
        }));

        const { selectedCategories } = await inquirer.prompt([{
          type: 'checkbox',
          name: 'selectedCategories',
          message: 'Select agent categories to browse:',
          choices: categoryChoices,
          pageSize: 10,
          validate: (answers) => {
            if (answers.length === 0) {
              return 'Please select at least one category or press Ctrl+C to exit.';
            }
            return true;
          },
        }]);

        if (selectedCategories.length === 0) {
          console.log(chalk.yellow('No categories selected.'));
          return;
        }

        // Step 2: Show agents from selected categories
        const availableAgents = await agentManager.listAgents({ available: true });
        const agentChoices: AgentChoice[] = [];

        for (const agent of availableAgents) {
          if (selectedCategories.includes(agent.category)) {
            const isInstalled = installedAgents.includes(agent.name);
            
            agentChoices.push({
              name: `${agent.name} - ${agent.description}`,
              value: agent.name,
              category: agent.category,
              checked: false,
              disabled: isInstalled ? chalk.gray('(already installed)') : undefined,
            });
          }
        }

        if (agentChoices.length === 0) {
          console.log(chalk.yellow('No agents available in selected categories.'));
          return;
        }

        // Group agents by category for better display
        const groupedChoices: any[] = [
          {
            name: chalk.yellow('← Go back to category selection'),
            value: '__GO_BACK__',
            short: 'Go back',
          },
          new inquirer.Separator(),
        ];
        
        selectedCategories.forEach((catName: string) => {
          const category = categories.find(c => c.name === catName);
          const categoryAgents = agentChoices.filter(a => a.category === catName);
          
          groupedChoices.push({
            name: chalk.bold.cyan(`\n=== ${category?.description} ===`),
            disabled: ' ',
            value: null,
          });
          
          groupedChoices.push(...categoryAgents);
        });

        const { selectedAgents } = await inquirer.prompt([{
          type: 'checkbox',
          name: 'selectedAgents',
          message: 'Select agents to install (use Space to select, Enter to confirm):',
          choices: groupedChoices,
          pageSize: 20,
        }]);

        // Check if user wants to go back
        if (selectedAgents.includes('__GO_BACK__')) {
          continue; // Go back to category selection
        }

        // Filter out non-agent selections
        agentsToInstall = selectedAgents.filter((agent: string) => agent !== '__GO_BACK__');
        
        if (agentsToInstall.length === 0) {
          console.log(chalk.yellow('\nNo agents selected. Going back to category selection...'));
          continue;
        }
        
        continueSelection = false; // Exit the loop
        
        // Show summary before installation
        if (agentsToInstall.length > 0) {
          console.log(chalk.cyan('\n📋 Installation Summary:\n'));
          
          const agentsByCategory = agentsToInstall.reduce((acc, agentName) => {
            const agent = availableAgents.find(a => a.name === agentName);
            if (agent) {
              if (!acc[agent.category]) {
                acc[agent.category] = [];
              }
              acc[agent.category].push(agent.name);
            }
            return acc;
          }, {} as Record<string, string[]>);

          for (const [category, agents] of Object.entries(agentsByCategory)) {
            const categoryInfo = categories.find(c => c.name === category);
            console.log(chalk.bold(`${categoryInfo?.description}:`));
            agents.forEach(agent => console.log(`  - ${agent}`));
          }

          const { confirmInstall } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirmInstall',
            message: `\nProceed with installing ${agentsToInstall.length} agent(s)?`,
            default: true,
          }]);

          if (!confirmInstall) {
            console.log(chalk.yellow('\nInstallation cancelled.'));
            return;
          }
        }
      }
    } 
    // Category-based installation
    else if (options.categories) {
      const categories = options.categories;
      
      for (const category of categories) {
        if (!categoryManager.exists(category)) {
          console.error(chalk.red(`Error: Unknown category "${category}"`));
          process.exit(1);
        }
        
        const categoryAgents = categoryManager.getAgentsByCategory(category);
        agentsToInstall.push(...categoryAgents);
      }
    } 
    // Agent-based installation
    else if (options.agents) {
      agentsToInstall = options.agents;
    }

    if (agentsToInstall.length === 0) {
      console.log(chalk.yellow('No agents selected for installation.'));
      return;
    }

    console.log(chalk.bold(`\n🔧 Installing ${agentsToInstall.length} agent(s)...\n`));

    const results = {
      success: [] as string[],
      failed: [] as { name: string; error: string }[],
      skipped: [] as string[],
    };

    for (const agentName of agentsToInstall) {
      const spinner = ora(`Installing ${agentName}...`).start();

      try {
        const agent = await agentManager.getAgent(agentName);
        
        if (!agent) {
          throw new Error('Agent not found');
        }

        if (agent.installed && !options.force) {
          spinner.info(`${agentName} is already installed`);
          results.skipped.push(agentName);
          continue;
        }

        await agentManager.installAgent(agentName, {
          global: options.global,
          force: options.force,
        });

        spinner.succeed(`Installed ${agentName} v${agent.version}`);
        results.success.push(agentName);
      } catch (error: any) {
        spinner.fail(`Failed to install ${agentName}: ${error.message}`);
        results.failed.push({ name: agentName, error: error.message });
      }
    }

    // Update project configuration
    if (results.success.length > 0) {
      const configFile = path.join(configPath, 'config.json');
      if (await fs.pathExists(configFile)) {
        const config = await fs.readJson(configFile);
        const currentAgents = new Set(config.agents || []);
        
        results.success.forEach(agent => currentAgents.add(agent));
        
        config.agents = Array.from(currentAgents);
        config.updatedAt = new Date().toISOString();
        
        await fs.writeJson(configFile, config, { spaces: 2 });
      }
    }

    // Summary
    console.log(chalk.bold('\n=== Installation Summary ===\n'));
    
    if (results.success.length > 0) {
      console.log(chalk.green(`✓ Successfully installed: ${results.success.length} agent(s)`));
      results.success.forEach(name => console.log(chalk.green(`  - ${name}`)));
    }
    
    if (results.skipped.length > 0) {
      console.log(chalk.blue(`⊘ Skipped (already installed): ${results.skipped.length} agent(s)`));
      results.skipped.forEach(name => console.log(chalk.blue(`  - ${name}`)));
    }
    
    if (results.failed.length > 0) {
      console.log(chalk.red(`✗ Failed: ${results.failed.length} agent(s)`));
      results.failed.forEach(({ name, error }) => 
        console.log(chalk.red(`  - ${name}: ${error}`))
      );
    }

    // Next steps
    if (results.success.length > 0) {
      console.log(chalk.gray('\n📝 Next steps:'));
      console.log(chalk.gray('1. Review new agents in .claude/agents/'));
      console.log(chalk.gray('2. Use Claude Code with your enhanced agent configuration'));
      console.log(chalk.gray('3. Run "npx sub-agents list" to see all installed agents\n'));
    }

    // Offer integration setup after successful agent installation
    if (results.success.length > 0) {
      const integrationManager = new IntegrationManager(process.cwd());
      const serenaStatus = await integrationManager.checkSerenaStatus();
      
      if (!serenaStatus.initialized) {
        console.log(chalk.cyan('\n🔌 Optional Integrations Available\n'));
        
        const choice = await integrationManager.offerIntegrationChoice();
        
        if (choice === 'recommended') {
          await integrationManager.installIntegrations(['serena']);
        } else if (choice === 'custom') {
          const selectedIntegrations = await integrationManager.promptForIntegrations();
          if (selectedIntegrations.length > 0) {
            await integrationManager.installIntegrations(selectedIntegrations);
          }
        }
      }
    }

    // Exit with error if any installations failed
    if (results.failed.length > 0) {
      process.exit(1);
    }
  });