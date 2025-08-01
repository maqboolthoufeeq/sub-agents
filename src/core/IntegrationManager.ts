import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';
import fs from 'fs-extra';

export interface Integration {
  name: string;
  enabled: boolean;
  initialized: boolean;
  indexedAt?: string;
}

export interface IntegrationConfig {
  integrations: {
    [key: string]: Integration;
  };
}

export class IntegrationManager {
  private projectPath: string;
  private configPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.configPath = join(projectPath, '.claude', 'config.json');
  }

  async checkSerenaStatus(): Promise<Integration> {
    if (await fs.pathExists(this.configPath)) {
      const config = await fs.readJson(this.configPath);
      const integrations = config.integrations || {};
      
      return integrations.serena || {
        name: 'serena',
        enabled: false,
        initialized: false
      };
    }
    
    return {
      name: 'serena',
      enabled: false,
      initialized: false
    };
  }

  async isSerenaInitialized(): Promise<boolean> {
    const status = await this.checkSerenaStatus();
    
    // Check if MCP server is configured
    try {
      const result = execSync('claude mcp list', { encoding: 'utf8' });
      if (!result.includes('serena')) {
        return false;
      }
    } catch {
      return false;
    }

    // Check if project is indexed
    const indexFile = join(this.projectPath, '.serena', 'index.json');
    if (!existsSync(indexFile)) {
      return false;
    }

    return status.initialized;
  }

  async initializeSerena(): Promise<void> {
    console.log(chalk.cyan('\n🔧 Initializing Serena integration...'));

    try {
      // Add Serena MCP server
      console.log(chalk.gray('Adding Serena MCP server...'));
      execSync(
        `claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena-mcp-server --context ide-assistant --project ${this.projectPath}`,
        { stdio: 'inherit' }
      );

      // Index the project
      console.log(chalk.gray('\nIndexing project...'));
      execSync('uvx --from git+https://github.com/oraios/serena index-project', {
        cwd: this.projectPath,
        stdio: 'inherit'
      });

      // Update config
      let config: any = {};
      if (await fs.pathExists(this.configPath)) {
        config = await fs.readJson(this.configPath);
      }
      
      if (!config.integrations) {
        config.integrations = {};
      }
      
      config.integrations.serena = {
        name: 'serena',
        enabled: true,
        initialized: true,
        indexedAt: new Date().toISOString()
      };
      
      await fs.writeJson(this.configPath, config, { spaces: 2 });

      console.log(chalk.green('\n✅ Serena initialized successfully!'));
      console.log(chalk.gray('\nTo read Serena\'s initial instructions:'));
      console.log(chalk.cyan('  - Say "read Serena\'s initial instructions"'));
      console.log(chalk.cyan('  - Or run /mcp__serena__initial_instructions'));
      console.log(chalk.gray('\nDashboard: http://127.0.0.1:24282/dashboard/index.html'));
    } catch (error: any) {
      console.error(chalk.red('Failed to initialize Serena:'), error.message);
      throw error;
    }
  }

  async getProjectMemory(): Promise<void> {
    console.log(chalk.cyan('\n📖 Reading project memory from Serena...'));
    console.log(chalk.gray('serena - read_memory (MCP)(memory_file_name: "project_structure.md")'));
  }

  async promptForIntegrations(): Promise<string[]> {
    const status = await this.checkSerenaStatus();
    
    if (status.initialized) {
      console.log(chalk.green('\n✅ Serena is already initialized for this project'));
      await this.getProjectMemory();
      return [];
    }

    const inquirer = (await import('inquirer')).default;
    
    const { useIntegrations } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useIntegrations',
        message: 'Would you like to enable optional integrations?',
        default: true
      }
    ]);

    if (!useIntegrations) {
      return [];
    }

    const { integrations } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'integrations',
        message: 'Select integrations to enable:',
        choices: [
          {
            name: 'Serena - Semantic code analysis for improved context',
            value: 'serena',
            checked: true
          }
        ]
      }
    ]);

    return integrations;
  }

  async installIntegrations(integrations: string[]): Promise<void> {
    for (const integration of integrations) {
      if (integration === 'serena') {
        await this.initializeSerena();
      }
    }
  }

  async offerIntegrationChoice(): Promise<'custom' | 'recommended' | 'skip'> {
    const inquirer = (await import('inquirer')).default;
    
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'How would you like to configure integrations?',
        choices: [
          {
            name: 'Recommended (Automatically install Serena)',
            value: 'recommended'
          },
          {
            name: 'Custom (Choose integrations)',
            value: 'custom'
          },
          {
            name: 'Skip integrations',
            value: 'skip'
          }
        ]
      }
    ]);

    return choice;
  }
}