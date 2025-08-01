#!/usr/bin/env node

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue('\n🔍 Running pre-publish checks...\n'));

const checks = [
  {
    name: 'npm authentication',
    command: 'npm whoami',
    errorMessage: 'Not logged in to npm. Run: npm login'
  },
  {
    name: 'build output exists',
    check: () => existsSync('./dist'),
    errorMessage: 'Build output missing. Run: npm run build'
  },
  {
    name: 'TypeScript compilation',
    command: 'npm run build',
    errorMessage: 'TypeScript compilation failed'
  },
  {
    name: 'linting',
    command: 'npm run lint',
    errorMessage: 'Linting errors found'
  }
];

let failed = false;

for (const check of checks) {
  process.stdout.write(`Checking ${check.name}... `);
  
  try {
    if (check.command) {
      execSync(check.command, { stdio: 'pipe' });
    } else if (check.check) {
      if (!check.check()) {
        throw new Error();
      }
    }
    console.log(chalk.green('✓'));
  } catch (error) {
    console.log(chalk.red('✗'));
    console.log(chalk.red(`  ${check.errorMessage}`));
    failed = true;
  }
}

console.log();

if (failed) {
  console.log(chalk.red('❌ Pre-publish checks failed. Please fix the issues above.'));
  process.exit(1);
} else {
  console.log(chalk.green('✅ All checks passed! Ready to publish.'));
  console.log(chalk.gray('\nTo publish: npm publish --access public'));
}