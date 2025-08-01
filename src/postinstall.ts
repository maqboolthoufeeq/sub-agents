#!/usr/bin/env node
import chalk from 'chalk';
import boxen from 'boxen';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

// Display welcome message
const welcomeMessage = boxen(
  chalk.bold.green(`Sub-Agents v${packageJson.version}`) + '\n\n' +
  chalk.white('Thank you for installing sub-agents!') + '\n\n' +
  chalk.gray('Get started with:') + '\n' +
  chalk.cyan(' npx sub-agents --help') + '\n' +
  chalk.cyan(' npx sub-agents categories') + '\n' +
  chalk.cyan(' npx sub-agents list') + '\n\n' +
  chalk.gray('Documentation:') + '\n' +
  chalk.blue('  https://github.com/maqboolthoufeeq/sub-agents'),
  {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'green',
  }
);

console.log(welcomeMessage);