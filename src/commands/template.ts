import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import { dirname } from 'path';

const agentTemplate = `---
name: my-agent
category: generic
description: A brief description of what this agent does
version: 1.0.0
author: Your Name
license: MIT
tools:
  - tool1
  - tool2
tags:
  - tag1
  - tag2
keywords:
  - keyword1
  - keyword2
dependencies:
  - dependency-agent
conflicts:
  - conflicting-agent
repository: https://github.com/username/repo
homepage: https://example.com
---

# My Agent

A comprehensive description of what this agent does and its purpose.

## Overview

This agent specializes in [specific area/technology]. It provides expert guidance on [topics].

## Capabilities

- **Capability 1**: Description of what the agent can do
- **Capability 2**: Another capability with details
- **Capability 3**: Additional functionality

## Required Tools

This agent requires the following tools to function properly:
- Tool 1: Description and purpose
- Tool 2: Description and purpose

## Usage

This agent is best suited for:
- Use case 1: When you need to...
- Use case 2: Perfect for situations where...
- Use case 3: Ideal when working with...

## Configuration

### Environment Variables
- \`VAR_NAME\`: Description of the variable

### Settings
- \`setting1\`: Default value and purpose
- \`setting2\`: Configuration options

## Examples

### Example 1: Basic Usage

\`\`\`javascript
// Example code demonstrating basic usage
const example = "code here";
\`\`\`

### Example 2: Advanced Usage

\`\`\`python
# More complex example
def advanced_example():
    pass
\`\`\`

## Best Practices

1. **Practice 1**: Always ensure that...
2. **Practice 2**: For optimal results...
3. **Practice 3**: Remember to...

## Common Patterns

### Pattern 1: Name
Description and when to use this pattern.

### Pattern 2: Name
Another common pattern with examples.

## Troubleshooting

### Issue 1: Common Problem
**Solution**: How to resolve this issue

### Issue 2: Another Problem
**Solution**: Steps to fix

## Limitations

- Limitation 1: This agent cannot...
- Limitation 2: Not suitable for...
- Limitation 3: Requires...

## Performance Considerations

- Consideration 1
- Consideration 2

## Security Notes

Important security considerations when using this agent.

## Related Agents

- **related-agent-1**: How it complements this agent
- **related-agent-2**: When to use instead

## Changelog

### Version 1.0.0
- Initial release
- Core functionality implemented

## Contributing

Guidelines for contributing to this agent definition.

## Additional Resources

- [Resource 1](https://example.com)
- [Resource 2](https://example.com)
`;

export const templateCommand = new Command('template')
  .description('Generate an agent definition template')
  .option('-o, --output <path>', 'Output file path', './agent-template.md')
  .action(async (options) => {
    const outputPath = options.output;
    const outputDir = dirname(outputPath);

    try {
      // Create directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true });

      // Check if file already exists
      try {
        await fs.access(outputPath);
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `File ${outputPath} already exists. Overwrite?`,
            default: false,
          },
        ]);

        if (!answers.overwrite) {
          console.log(chalk.yellow('Template generation cancelled.'));
          return;
        }
      } catch {
        // File doesn't exist, which is fine
      }

      // Write template
      await fs.writeFile(outputPath, agentTemplate, 'utf-8');

      console.log(chalk.green(`\n✓ Agent template created successfully!`));
      console.log(chalk.gray(`  File: ${outputPath}`));
      
      console.log(chalk.yellow('\n💡 Next steps:'));
      console.log(`  1. Edit ${outputPath} to create your agent definition`);
      console.log(`  2. Update the frontmatter with your agent's metadata`);
      console.log(`  3. Fill in the content sections with detailed information`);
      console.log(`  4. Run "sub-agents validate --path=${outputPath}" to validate`);
      
      console.log(chalk.blue('\n📚 Template sections:'));
      console.log('  - Frontmatter: Agent metadata (name, version, etc.)');
      console.log('  - Overview: High-level description of the agent');
      console.log('  - Capabilities: What the agent can do');
      console.log('  - Usage: When and how to use the agent');
      console.log('  - Examples: Code samples and use cases');
      console.log('  - Best Practices: Recommendations for optimal use');
      console.log('  - Limitations: What the agent cannot do');
      console.log('  - Related Agents: Other agents that work well together');
    } catch (error: any) {
      console.error(chalk.red(`Error creating template: ${error.message}`));
      process.exit(1);
    }
  });