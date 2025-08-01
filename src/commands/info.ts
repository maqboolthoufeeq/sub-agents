import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import { AgentManager } from '../core/AgentManager.js';

export const infoCommand = new Command('info')
  .description('Display detailed information about an agent')
  .argument('<agent-name>', 'Name of the agent')
  .option('--json', 'Output in JSON format')
  .option('--markdown', 'Show raw markdown content')
  .action(async (agentName: string, options) => {
    const agentManager = new AgentManager();
    await agentManager.initialize();

    const agent = await agentManager.getAgent(agentName);

    if (!agent) {
      console.error(chalk.red(`Error: Agent "${agentName}" not found`));
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(agent, null, 2));
      return;
    }

    if (options.markdown) {
      console.log(agent.content);
      return;
    }

    // Header
    const header = boxen(
      chalk.bold.white(agent.name) + '\n' +
      chalk.gray(agent.description),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: agent.installed ? 'green' : 'gray',
      }
    );

    console.log('\n' + header + '\n');

    // Metadata
    console.log(chalk.bold('📦 Package Information:'));
    console.log(`  ${chalk.gray('Category:')} ${agent.category}`);
    console.log(`  ${chalk.gray('Version:')} ${agent.version}`);
    console.log(`  ${chalk.gray('Author:')} ${agent.author}`);
    console.log(`  ${chalk.gray('License:')} ${agent.license}`);

    if (agent.installed) {
      console.log(`  ${chalk.gray('Status:')} ${chalk.green('Installed')}`);
      if (agent.availableUpdate) {
        console.log(`  ${chalk.gray('Update Available:')} ${chalk.yellow(agent.availableUpdate)}`);
      }
    } else {
      console.log(`  ${chalk.gray('Status:')} ${chalk.gray('Not Installed')}`);
    }

    // Tools
    if (agent.tools && agent.tools.length > 0) {
      console.log(chalk.bold('\n🔧 Required Tools:'));
      agent.tools.forEach(tool => {
        console.log(`  - ${tool}`);
      });
    }

    // Tags
    if (agent.tags && agent.tags.length > 0) {
      console.log(chalk.bold('\n🏷️  Tags:'));
      console.log(`  ${agent.tags.map(tag => chalk.cyan(`#${tag}`)).join(' ')}`);
    }

    // Dependencies
    if (agent.dependencies && agent.dependencies.length > 0) {
      console.log(chalk.bold('\n📌 Dependencies:'));
      for (const dep of agent.dependencies) {
        const depAgent = await agentManager.getAgent(dep);
        const status = depAgent?.installed 
          ? chalk.green('✓ Installed') 
          : chalk.yellow('⚠ Not Installed');
        console.log(`  - ${dep} ${status}`);
      }
    }

    // Conflicts
    if (agent.conflicts && agent.conflicts.length > 0) {
      console.log(chalk.bold('\n⚠️  Conflicts:'));
      agent.conflicts.forEach(conflict => {
        console.log(`  - ${conflict}`);
      });
    }

    // Links
    if (agent.repository || agent.homepage) {
      console.log(chalk.bold('\n🔗 Links:'));
      if (agent.repository) {
        console.log(`  ${chalk.gray('Repository:')} ${chalk.blue(agent.repository)}`);
      }
      if (agent.homepage) {
        console.log(`  ${chalk.gray('Homepage:')} ${chalk.blue(agent.homepage)}`);
      }
    }

    // Content preview
    console.log(chalk.bold('\n📄 Description:'));
    const contentLines = agent.content.split('\n').slice(0, 10);
    const preview = contentLines.join('\n');
    console.log(chalk.gray(preview));
    
    if (agent.content.split('\n').length > 10) {
      console.log(chalk.gray('\n... (truncated)'));
    }

    // Installation command
    if (!agent.installed) {
      console.log(chalk.bold('\n💡 To install this agent:'));
      console.log(chalk.green(` npx sub-agents install --agents=${agent.name}`));
    }
  });