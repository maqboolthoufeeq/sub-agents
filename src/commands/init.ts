import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface InitOptions {
  interactive?: boolean;
  categories?: string;
  agents?: string;
  force?: boolean;
}

interface ProjectConfig {
  name: string;
  version: string;
  agents: string[];
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export function createInitCommand(): Command {
  const command = new Command('init');
  
  command
    .description('Initialize sub-agents in your project')
    .option('-i, --interactive', 'Interactive mode to select agents')
    .option('-c, --categories <categories>', 'Categories to include (comma-separated)')
    .option('-a, --agents <agents>', 'Specific agents to include (comma-separated)')
    .option('-f, --force', 'Force initialization (overwrite existing configuration)')
    .action(async (options: InitOptions) => {
      await initializeProject(options);
    });
    
  return command;
}

async function initializeProject(options: InitOptions) {
  console.log(chalk.blue('\n🚀 Initializing sub-agents in your project...\n'));
  
  // Check if already initialized
  const configPath = path.join(process.cwd(), '.claude');
  const configExists = await fs.pathExists(configPath);
  
  if (configExists && !options.force) {
    console.log(chalk.yellow('⚠️  Project already initialized with sub-agents.'));
    console.log(chalk.gray('Use --force to reinitialize.\n'));
    
    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Would you like to add more agents instead?',
      default: true
    }]);
    
    if (!proceed) {
      process.exit(0);
    }
    
    // Redirect to install command
    console.log(chalk.gray('\nUse: sub-agents install --interactive\n'));
    return;
  }
  
  // Create .claude directory structure
  const spinner = ora('Creating .claude directory structure...').start();
  
  try {
    // Create directories
    await fs.ensureDir(path.join(configPath, 'agents'));
    await fs.ensureDir(path.join(configPath, 'templates'));
    
    // Detect project type
    const projectType = await detectProjectType();
    
    spinner.succeed('Created .claude directory structure');
    
    let selectedAgents: string[] = [];
    let selectedCategories: string[] = [];
    
    if (options.interactive) {
      // Interactive mode
      const result = await promptForAgents(projectType);
      selectedAgents = result.agents;
      selectedCategories = result.categories;
    } else if (options.agents || options.categories) {
      // Command line options
      selectedAgents = options.agents ? options.agents.split(',').map(a => a.trim()) : [];
      selectedCategories = options.categories ? options.categories.split(',').map(c => c.trim()) : [];
    } else {
      // Auto-select based on project type
      const result = await autoSelectAgents(projectType);
      selectedAgents = result.agents;
      selectedCategories = result.categories;
    }
    
    // Copy selected agents
    const copySpinner = ora('Installing selected agents...').start();
    await copyAgentsToProject(selectedAgents, selectedCategories);
    copySpinner.succeed('Agents installed successfully');
    
    // Create configuration file
    const config: ProjectConfig = {
      name: path.basename(process.cwd()),
      version: '1.0.0',
      agents: selectedAgents,
      categories: selectedCategories,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeJson(path.join(configPath, 'config.json'), config, { spaces: 2 });
    
    // Create .claude/README.md
    await createProjectReadme(configPath, selectedAgents);
    
    // Add .claude to .gitignore if it exists
    await updateGitignore();
    
    console.log(chalk.green('\n✅ sub-agents initialized successfully!\n'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('1. Review agents in .claude/agents/'));
    console.log(chalk.gray('2. Use Claude Code with your project-specific agents'));
    console.log(chalk.gray('3. Run "npx sub-agents list" to see installed agents\n'));
    
  } catch (error) {
    spinner.fail('Failed to initialize sub-agents');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

async function detectProjectType(): Promise<string> {
  const cwd = process.cwd();
  
  // Check for common project files
  const checks = [
    { file: 'package.json', type: 'node' },
    { file: 'requirements.txt', type: 'python' },
    { file: 'Pipfile', type: 'python' },
    { file: 'pyproject.toml', type: 'python' },
    { file: 'Gemfile', type: 'ruby' },
    { file: 'go.mod', type: 'go' },
    { file: 'Cargo.toml', type: 'rust' },
    { file: 'pom.xml', type: 'java' },
    { file: 'build.gradle', type: 'java' }
  ];
  
  for (const check of checks) {
    if (await fs.pathExists(path.join(cwd, check.file))) {
      // Further detection for Node.js projects
      if (check.type === 'node') {
        const packageJson = await fs.readJson(path.join(cwd, 'package.json'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (deps.next) return 'nextjs';
        if (deps.react) return 'react';
        if (deps.vue) return 'vue';
        if (deps.angular) return 'angular';
        if (deps.svelte) return 'svelte';
        if (deps.express) return 'express';
        if (deps.fastify) return 'fastify';
      }
      
      // Python framework detection
      if (check.type === 'python') {
        if (await fs.pathExists(path.join(cwd, 'manage.py'))) return 'django';
        if (await fs.pathExists(path.join(cwd, 'app.py')) || 
            await fs.pathExists(path.join(cwd, 'main.py'))) {
          // Could be FastAPI or Flask
          return 'python';
        }
      }
      
      return check.type;
    }
  }
  
  return 'general';
}

async function promptForAgents(projectType: string) {
  console.log(chalk.cyan(`\nDetected project type: ${projectType}\n`));
  
  const categories = [
    { name: 'Frontend Frameworks', value: 'frontend' },
    { name: 'Backend Frameworks', value: 'backend' },
    { name: 'Cloud & DevOps', value: 'cloud-devops' },
    { name: 'Databases', value: 'database' },
    { name: 'AI/ML', value: 'ai-ml' },
    { name: 'Generic Roles', value: 'generic' }
  ];
  
  const { selectedCategories } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selectedCategories',
    message: 'Select agent categories for your project:',
    choices: categories,
    default: getDefaultCategories(projectType)
  }]);
  
  // Based on selected categories, show specific agents
  const agentChoices = await getAgentChoices(selectedCategories);
  
  const { selectedAgents } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selectedAgents',
    message: 'Select specific agents to install:',
    choices: agentChoices,
    default: getDefaultAgents(projectType)
  }]);
  
  return {
    agents: selectedAgents,
    categories: selectedCategories
  };
}

async function autoSelectAgents(projectType: string) {
  const mapping: Record<string, { agents: string[], categories: string[] }> = {
    nextjs: {
      agents: ['nextjs-developer', 'react-component-builder', 'postgres-dba'],
      categories: ['frontend', 'database']
    },
    react: {
      agents: ['react-component-builder', 'senior-software-engineer'],
      categories: ['frontend', 'generic']
    },
    django: {
      agents: ['django-developer', 'postgres-dba', 'redis-expert'],
      categories: ['backend', 'database']
    },
    express: {
      agents: ['express-specialist', 'mongodb-specialist'],
      categories: ['backend', 'database']
    },
    python: {
      agents: ['fastapi-builder', 'senior-software-engineer'],
      categories: ['backend', 'generic']
    },
    general: {
      agents: ['senior-software-engineer'],
      categories: ['generic']
    }
  };
  
  return mapping[projectType] || mapping.general;
}

async function copyAgentsToProject(agents: string[], _categories: string[]) {
  const sourcePath = path.join(__dirname, '..', '..', 'agents');
  const targetPath = path.join(process.cwd(), '.claude', 'agents');
  
  // Copy specific agents
  for (const agent of agents) {
    for (const category of await fs.readdir(sourcePath)) {
      const agentFile = path.join(sourcePath, category, `${agent}.md`);
      if (await fs.pathExists(agentFile)) {
        const targetDir = path.join(targetPath, category);
        await fs.ensureDir(targetDir);
        await fs.copy(agentFile, path.join(targetDir, `${agent}.md`));
      }
    }
  }
}

async function createProjectReadme(configPath: string, agents: string[]) {
  const readme = `# Claude Agents Configuration

This directory contains AI agent configurations for your project.

## Installed Agents

${agents.map(agent => `- ${agent}`).join('\n')}

## Usage

These agents are automatically available when using Claude Code in this project.

## Managing Agents

- Add more agents: \`npx sub-agents install --interactive\`
- List agents: \`npx sub-agents list\`
- Remove agents: \`npx sub-agents uninstall --agents=<agent-name>\`

## Custom Agents

Create custom agents in the \`.claude/agents/custom/\` directory.
`;

  await fs.writeFile(path.join(configPath, 'README.md'), readme);
}

async function updateGitignore() {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  
  if (await fs.pathExists(gitignorePath)) {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    
    if (!content.includes('.claude/')) {
      const updatedContent = content + '\n# Claude agents configuration\n.claude/\n';
      await fs.writeFile(gitignorePath, updatedContent);
    }
  }
}

function getDefaultCategories(projectType: string): string[] {
  const mapping: Record<string, string[]> = {
    nextjs: ['frontend', 'database'],
    react: ['frontend'],
    django: ['backend', 'database'],
    express: ['backend', 'database'],
    python: ['backend'],
    general: ['generic']
  };
  
  return mapping[projectType] || ['generic'];
}

function getDefaultAgents(projectType: string): string[] {
  const mapping: Record<string, string[]> = {
    nextjs: ['nextjs-developer'],
    react: ['react-component-builder'],
    django: ['django-developer'],
    express: ['express-specialist'],
    python: ['fastapi-builder'],
    general: ['senior-software-engineer']
  };
  
  return mapping[projectType] || ['senior-software-engineer'];
}

async function getAgentChoices(categories: string[]): Promise<any[]> {
  const sourcePath = path.join(__dirname, '..', '..', 'agents');
  const choices = [];
  
  for (const category of categories) {
    const categoryPath = path.join(sourcePath, category);
    if (await fs.pathExists(categoryPath)) {
      const agents = await fs.readdir(categoryPath);
      
      for (const agent of agents) {
        if (agent.endsWith('.md')) {
          const agentName = agent.replace('.md', '');
          choices.push({
            name: `${agentName} (${category})`,
            value: agentName
          });
        }
      }
    }
  }
  
  return choices;
}