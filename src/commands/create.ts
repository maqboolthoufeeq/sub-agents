import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import { join } from 'path';
import { CategoryManager } from '../core/CategoryManager.js';
import { AgentManager } from '../core/AgentManager.js';

export const createCommand = new Command('create')
  .description('Create a new agent definition')
  .option('-n, --name <name>', 'Agent name')
  .option('-c, --category <category>', 'Agent category')
  .option('-d, --description <description>', 'Agent description')
  .option('-o, --output <path>', 'Output directory (default: current directory)')
  .option('-i, --interactive', 'Interactive mode')
  .action(async (options) => {
    const categoryManager = new CategoryManager();
    const agentManager = new AgentManager();
    
    let agentData: any = {
      name: options.name,
      category: options.category,
      description: options.description,
    };

    // Interactive mode or fill missing data
    if (options.interactive || !agentData.name || !agentData.category) {
      const questions = [];

      if (!agentData.name) {
        questions.push({
          type: 'input',
          name: 'name',
          message: 'Agent name:',
          validate: async (input: string) => {
            if (!input || input.trim().length === 0) {
              return 'Agent name is required';
            }
            if (!/^[a-z0-9-]+$/.test(input)) {
              return 'Agent name must contain only lowercase letters, numbers, and hyphens';
            }
            const existing = await agentManager.getAgent(input);
            if (existing) {
              return `Agent "${input}" already exists`;
            }
            return true;
          },
        });
      }

      if (!agentData.category) {
        const categories = categoryManager.getAll();
        questions.push({
          type: 'list',
          name: 'category',
          message: 'Select category:',
          choices: categories.map(c => ({
            name: `${c.name} - ${c.description}`,
            value: c.name,
          })),
        });
      }

      if (!agentData.description) {
        questions.push({
          type: 'input',
          name: 'description',
          message: 'Agent description:',
          validate: (input: string) => {
            if (!input || input.trim().length < 10) {
              return 'Description must be at least 10 characters long';
            }
            return true;
          },
        });
      }

      // Additional fields
      questions.push(
        {
          type: 'input',
          name: 'author',
          message: 'Author name:',
          default: 'Anonymous',
        },
        {
          type: 'input',
          name: 'version',
          message: 'Version:',
          default: '1.0.0',
          validate: (input: string) => {
            if (!/^\d+\.\d+\.\d+$/.test(input)) {
              return 'Version must follow semantic versioning (e.g., 1.0.0)';
            }
            return true;
          },
        },
        {
          type: 'list',
          name: 'license',
          message: 'License:',
          choices: ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'Other'],
        },
        {
          type: 'input',
          name: 'tools',
          message: 'Required tools (comma-separated):',
          filter: (input: string) => input.split(',').map(t => t.trim()).filter(t => t),
        },
        {
          type: 'input',
          name: 'tags',
          message: 'Tags (comma-separated):',
          filter: (input: string) => input.split(',').map(t => t.trim()).filter(t => t),
        },
        {
          type: 'input',
          name: 'dependencies',
          message: 'Dependencies (comma-separated agent names):',
          filter: (input: string) => input.split(',').map(t => t.trim()).filter(t => t),
        },
      );

      const answers = await inquirer.prompt(questions);
      agentData = { ...agentData, ...answers };
    }

    // Set defaults for missing fields
    agentData.author = agentData.author || 'Anonymous';
    agentData.version = agentData.version || '1.0.0';
    agentData.license = agentData.license || 'MIT';
    agentData.tools = agentData.tools || [];
    agentData.tags = agentData.tags || [];

    // Create agent content
    const frontmatter = [
      '---',
      `name: ${agentData.name}`,
      `category: ${agentData.category}`,
      `description: ${agentData.description}`,
      `version: ${agentData.version}`,
      `author: ${agentData.author}`,
      `license: ${agentData.license}`,
    ];

    if (agentData.tools.length > 0) {
      frontmatter.push('tools:');
      agentData.tools.forEach((tool: string) => {
        frontmatter.push(`  - ${tool}`);
      });
    }

    if (agentData.tags.length > 0) {
      frontmatter.push('tags:');
      agentData.tags.forEach((tag: string) => {
        frontmatter.push(`  - ${tag}`);
      });
    }

    if (agentData.dependencies && agentData.dependencies.length > 0) {
      frontmatter.push('dependencies:');
      agentData.dependencies.forEach((dep: string) => {
        frontmatter.push(`  - ${dep}`);
      });
    }

    frontmatter.push('---');

    const content = `${frontmatter.join('\n')}

# ${agentData.name}

${agentData.description}

## Overview

This agent specializes in...

## Capabilities

- Capability 1
- Capability 2
- Capability 3

## Usage

This agent is best suited for:
- Use case 1
- Use case 2
- Use case 3

## Configuration

No additional configuration required.

## Examples

### Example 1: Basic Usage

\`\`\`
// Example code or usage
\`\`\`

## Best Practices

- Best practice 1
- Best practice 2
- Best practice 3

## Limitations

- Limitation 1
- Limitation 2

## Related Agents

- Related agent 1
- Related agent 2
`;

    // Write file
    const outputDir = options.output || process.cwd();
    const categoryDir = join(outputDir, agentData.category);
    const filePath = join(categoryDir, `${agentData.name}.md`);

    await fs.mkdir(categoryDir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');

    console.log(chalk.green(`\n✓ Agent definition created successfully!`));
    console.log(chalk.gray(`  File: ${filePath}`));
    console.log(chalk.gray(`  Name: ${agentData.name}`));
    console.log(chalk.gray(`  Category: ${agentData.category}`));
    
    console.log(chalk.yellow('\n💡 Next steps:'));
    console.log(`  1. Edit ${filePath} to customize the agent definition`);
    console.log(`  2. Run "sub-agents validate --path=${filePath}" to validate`);
    console.log(`  3. Run "sub-agents install --agents=${agentData.name}" to test installation`);
  });