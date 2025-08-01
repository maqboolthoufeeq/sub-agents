import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { IntegrationManager } from '../core/IntegrationManager.js';

export const integrationsCommand = new Command('integrations')
  .description('Manage optional integrations like Serena')
  .option('-l, --list', 'List available integrations')
  .option('-s, --status', 'Show integration status')
  .option('-i, --install <name>', 'Install a specific integration')
  .option('-r, --refresh', 'Refresh Serena index')
  .action(async (options) => {
    // Check if project is initialized
    const configPath = path.join(process.cwd(), '.claude');
    if (!await fs.pathExists(configPath)) {
      console.log(chalk.yellow('⚠️  Project not initialized with sub-agents.'));
      console.log(chalk.gray('Run "npx sub-agents init" first.\n'));
      process.exit(1);
    }

    const integrationManager = new IntegrationManager(process.cwd());

    if (options.list) {
      console.log(chalk.cyan('\n📦 Available Integrations:\n'));
      console.log(chalk.bold('Serena'));
      console.log(chalk.gray('  Semantic code analysis for improved context fetching'));
      console.log(chalk.gray('  - Optimized token usage'));
      console.log(chalk.gray('  - Project structure memory'));
      console.log(chalk.gray('  - IDE assistant capabilities\n'));
      return;
    }

    if (options.status) {
      const serenaStatus = await integrationManager.checkSerenaStatus();
      console.log(chalk.cyan('\n🔌 Integration Status:\n'));
      
      if (serenaStatus.initialized) {
        console.log(chalk.green('✅ Serena: Initialized'));
        if (serenaStatus.indexedAt) {
          console.log(chalk.gray(`   Last indexed: ${new Date(serenaStatus.indexedAt).toLocaleString()}`));
        }
        console.log(chalk.gray('   Dashboard: http://127.0.0.1:24282/dashboard/index.html'));
        await integrationManager.getProjectMemory();
      } else {
        console.log(chalk.yellow('⚠️  Serena: Not initialized'));
        console.log(chalk.gray('   Run "npx sub-agents integrations --install serena" to set up'));
      }
      console.log();
      return;
    }

    if (options.install) {
      if (options.install.toLowerCase() === 'serena') {
        const serenaStatus = await integrationManager.checkSerenaStatus();
        
        if (serenaStatus.initialized) {
          console.log(chalk.yellow('\n⚠️  Serena is already initialized'));
          console.log(chalk.gray('Use --refresh to re-index the project\n'));
          return;
        }
        
        await integrationManager.initializeSerena();
      } else {
        console.log(chalk.red(`\n❌ Unknown integration: ${options.install}`));
        console.log(chalk.gray('Available integrations: serena\n'));
      }
      return;
    }

    if (options.refresh) {
      const serenaStatus = await integrationManager.checkSerenaStatus();
      
      if (!serenaStatus.initialized) {
        console.log(chalk.yellow('\n⚠️  Serena is not initialized'));
        console.log(chalk.gray('Run "npx sub-agents integrations --install serena" first\n'));
        return;
      }
      
      console.log(chalk.cyan('\n🔄 Refreshing Serena index...'));
      try {
        const { execSync } = await import('child_process');
        execSync('uvx --from git+https://github.com/oraios/serena index-project', {
          cwd: process.cwd(),
          stdio: 'inherit'
        });
        
        // Update config
        const configPath = path.join(process.cwd(), '.claude', 'config.json');
        if (await fs.pathExists(configPath)) {
          const config = await fs.readJson(configPath);
          if (config.integrations?.serena) {
            config.integrations.serena.indexedAt = new Date().toISOString();
            await fs.writeJson(configPath, config, { spaces: 2 });
          }
        }
        
        console.log(chalk.green('\n✅ Serena index refreshed successfully!\n'));
      } catch (error: any) {
        console.error(chalk.red('Failed to refresh index:'), error.message);
      }
      return;
    }

    // Default: show status
    const serenaStatus = await integrationManager.checkSerenaStatus();
    
    if (serenaStatus.initialized) {
      console.log(chalk.green('\n✅ Serena is active for this project'));
      await integrationManager.getProjectMemory();
      console.log(chalk.gray('\nManage at: http://127.0.0.1:24282/dashboard/index.html'));
    } else {
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
  });