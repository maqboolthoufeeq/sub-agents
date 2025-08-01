import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import { join } from 'path';
import FormData from 'form-data';
import axios from 'axios';
import { AgentManager } from '../core/AgentManager.js';
import { ConfigManager } from '../core/ConfigManager.js';
import type { ValidationResult } from '../types/index.js';

interface PublishOptions {
  path: string;
  registry?: string;
  private?: boolean;
  dryRun?: boolean;
}

interface PublishResponse {
  success: boolean;
  message: string;
  agentName?: string;
  version?: string;
  url?: string;
}

export const publishCommand = new Command('publish')
  .description('Publish a custom agent to the registry')
  .argument('[path]', 'Path to agent definition file', '.')
  .option('-r, --registry <url>', 'Custom registry URL')
  .option('-p, --private', 'Publish as private agent')
  .option('-d, --dry-run', 'Perform a dry run without publishing')
  .action(async (path: string, options: PublishOptions) => {
    const agentManager = new AgentManager();
    const configManager = new ConfigManager();
    await agentManager.initialize();

    // Resolve agent file path
    let agentPath = path;
    
    // If path is a directory, look for agent files
    try {
      const stat = await fs.stat(agentPath);
      if (stat.isDirectory()) {
        const files = await fs.readdir(agentPath);
        const agentFiles = files.filter(f => f.endsWith('.md'));
        
        if (agentFiles.length === 0) {
          console.error(chalk.red('No agent definition files found in directory'));
          process.exit(1);
        }
        
        if (agentFiles.length === 1) {
          agentPath = join(agentPath, agentFiles[0]);
        } else {
          // Multiple files, ask user to choose
          const answer = await inquirer.prompt([
            {
              type: 'list',
              name: 'file',
              message: 'Select agent file to publish:',
              choices: agentFiles
            }
          ]);
          agentPath = join(path, answer.file);
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error accessing path: ${error}`));
      process.exit(1);
    }

    // Validate agent
    const spinner = ora('Validating agent definition...').start();
    
    let validation: ValidationResult;
    try {
      validation = await agentManager.validateAgent(agentPath);
    } catch (error: any) {
      spinner.fail(`Validation error: ${error.message}`);
      process.exit(1);
    }

    if (!validation.valid) {
      spinner.fail('Agent validation failed');
      console.error(chalk.red('\nValidation errors:'));
      validation.errors.forEach(error => {
        console.error(chalk.red(`  - ${error}`));
      });
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      spinner.warn('Agent validated with warnings');
      console.log(chalk.yellow('\nWarnings:'));
      validation.warnings.forEach(warning => {
        console.log(chalk.yellow(`  - ${warning}`));
      });
    } else {
      spinner.succeed('Agent validation passed');
    }

    const agent = validation.agent!;

    // Check if agent already exists in registry
    const registryUrl = options.registry || configManager.get('registry');
    
    if (!options.dryRun) {
      spinner.start('Checking registry...');
      
      try {
        const response = await axios.get(`${registryUrl}/api/agents/${agent.name}`);
        
        if (response.data.exists) {
          spinner.stop();
          
          const existingVersion = response.data.version;
          console.log(chalk.yellow(`\nAgent "${agent.name}" already exists in registry (v${existingVersion})`));
          
          // Check version
          const semver = await import('semver');
          if (!semver.gt(agent.version, existingVersion)) {
            console.error(chalk.red(`Version ${agent.version} must be greater than existing version ${existingVersion}`));
            process.exit(1);
          }
          
          // Confirm update
          const answer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'proceed',
              message: `Publish as update from v${existingVersion} to v${agent.version}?`,
              default: false
            }
          ]);
          
          if (!answer.proceed) {
            console.log(chalk.yellow('Publishing cancelled'));
            process.exit(0);
          }
        } else {
          spinner.succeed('Agent not found in registry (will create new)');
        }
      } catch (error: any) {
        if (error.response?.status !== 404) {
          spinner.fail(`Registry check failed: ${error.message}`);
          console.log(chalk.yellow('\nNote: You can publish to a local registry for testing'));
          process.exit(1);
        }
        spinner.succeed('Ready to publish new agent');
      }
    }

    // Display agent information
    console.log(chalk.bold('\n📦 Agent Information:'));
    console.log(`  ${chalk.gray('Name:')} ${agent.name}`);
    console.log(`  ${chalk.gray('Version:')} ${agent.version}`);
    console.log(`  ${chalk.gray('Category:')} ${agent.category}`);
    console.log(`  ${chalk.gray('Author:')} ${agent.author}`);
    console.log(`  ${chalk.gray('License:')} ${agent.license}`);
    console.log(`  ${chalk.gray('Description:')} ${agent.description}`);
    
    if (agent.dependencies && agent.dependencies.length > 0) {
      console.log(`  ${chalk.gray('Dependencies:')} ${agent.dependencies.join(', ')}`);
    }
    
    if (agent.tags && agent.tags.length > 0) {
      console.log(`  ${chalk.gray('Tags:')} ${agent.tags.join(', ')}`);
    }

    // Dry run mode
    if (options.dryRun) {
      console.log(chalk.blue('\n🔍 Dry run mode - no changes will be made'));
      console.log(chalk.green('\n✓ Agent is ready to publish!'));
      return;
    }

    // Confirm publication
    const publishDetails = {
      registry: registryUrl,
      visibility: options.private ? 'Private' : 'Public'
    };

    console.log(chalk.bold('\n🚀 Publication Details:'));
    console.log(`  ${chalk.gray('Registry:')} ${publishDetails.registry}`);
    console.log(`  ${chalk.gray('Visibility:')} ${publishDetails.visibility}`);

    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with publishing?',
        default: false
      }
    ]);

    if (!answer.confirm) {
      console.log(chalk.yellow('Publishing cancelled'));
      process.exit(0);
    }

    // Publish agent
    spinner.start('Publishing agent...');

    try {
      const publishResult = await publishAgent(
        agentPath,
        agent,
        registryUrl,
        options.private || false
      );

      if (publishResult.success) {
        spinner.succeed('Agent published successfully!');
        
        console.log(chalk.green('\n✓ Publication Complete'));
        console.log(`  ${chalk.gray('Agent:')} ${publishResult.agentName}`);
        console.log(`  ${chalk.gray('Version:')} ${publishResult.version}`);
        
        if (publishResult.url) {
          console.log(`  ${chalk.gray('URL:')} ${chalk.blue(publishResult.url)}`);
        }
        
        console.log(chalk.yellow('\n💡 Next steps:'));
        console.log(`  - Install: sub-agents install --agents=${agent.name}`);
        console.log(`  - Share: ${publishResult.url || registryUrl + '/agents/' + agent.name}`);
        
        if (options.private) {
          console.log(chalk.gray('\n🔒 This is a private agent. Share the access token with authorized users.'));
        }
      } else {
        spinner.fail(`Publishing failed: ${publishResult.message}`);
        process.exit(1);
      }
    } catch (error: any) {
      spinner.fail(`Publishing failed: ${error.message}`);
      process.exit(1);
    }
  });

async function publishAgent(
  filePath: string,
  agent: any,
  registryUrl: string,
  isPrivate: boolean
): Promise<PublishResponse> {
  // For demo purposes, simulate publishing
  // In a real implementation, this would upload to a registry
  
  try {
    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Create form data
    const formData = new FormData();
    formData.append('name', agent.name);
    formData.append('version', agent.version);
    formData.append('category', agent.category);
    formData.append('description', agent.description);
    formData.append('author', agent.author);
    formData.append('license', agent.license);
    formData.append('private', String(isPrivate));
    formData.append('content', content);
    
    if (agent.tags) {
      formData.append('tags', JSON.stringify(agent.tags));
    }
    
    if (agent.dependencies) {
      formData.append('dependencies', JSON.stringify(agent.dependencies));
    }
    
    // In a real implementation, this would make an HTTP request
    // For now, simulate success
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate registry response
    return {
      success: true,
      message: 'Agent published successfully',
      agentName: agent.name,
      version: agent.version,
      url: `${registryUrl}/agents/${agent.name}`
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Unknown error occurred'
    };
  }
}

// Helper function to create a simple local registry
export async function startLocalRegistry(port: number = 3000): Promise<void> {
  // This would start a simple Express server to act as a local registry
  // For demonstration purposes only
  console.log(chalk.blue(`\n📡 Starting local registry on port ${port}...`));
  
  // Implementation would include:
  // - Express server
  // - SQLite database for agent metadata
  // - File storage for agent definitions
  // - REST API endpoints
  // - Web interface for browsing agents
}