# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands
```bash
# Build TypeScript to JavaScript
npm run build

# Development mode with auto-rebuild
npm run dev

# Run tests
npm test
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report

# Linting and formatting
npm run lint            # Run ESLint on src/**/*.ts
npm run format          # Format with Prettier

# Local testing
npm run link:global     # Link for global testing
npm run unlink:global   # Unlink from global
```

### CLI Commands (for testing)
```bash
# After building, test CLI commands with:
npx . init                                  # Initialize agents
npx . list                                  # List installed agents
npx . install --agents=<name>               # Install specific agent
npx . categories                            # Show all categories
npx . search <query>                        # Search for agents
npx . integrations --install serena         # Install Serena integration
```

## Architecture

### Core Concepts
- **Agents**: Markdown files with YAML frontmatter defining specialized AI assistants for Claude Code
- **Categories**: Groupings of agents (frontend, backend, cloud-devops, database, etc.)
- **Integrations**: Optional tools like Serena for semantic code analysis

### Key Directories
- `src/core/`: Core managers (AgentManager, ConfigManager, IntegrationManager, etc.)
- `src/commands/`: CLI command implementations
- `agents/`: Bundled agent definitions organized by category
- `templates/`: Agent templates for creating custom agents

### Data Flow
1. CLI commands in `src/commands/` handle user interactions
2. Core managers in `src/core/` manage agent lifecycle and configuration
3. Agents are installed to `.claude/agents/` in user projects
4. Configuration stored in both global (`~/.claude/`) and local (`.claude/`) directories

### Agent Format
Agents are Markdown files with YAML frontmatter:
```yaml
---
name: agent-name
category: backend
description: Brief description
version: 1.0.0
author: Author Name
license: MIT
tools: [Read, Write, Bash, Task]
tags: [nodejs, api]
---

# Agent content...
```

### Key Classes
- `AgentManager`: Handles agent discovery, installation, and updates
- `ConfigManager`: Manages global and project-specific configuration
- `IntegrationManager`: Manages optional integrations like Serena
- `CategoryManager`: Manages agent categories and listings

### TypeScript Configuration
- Target: ES2022
- Module: ES2022 
- Strict mode enabled
- Source maps and declarations generated
- All unused variables/parameters cause errors

## Important Patterns

### Error Handling
- Commands should use try-catch and provide helpful error messages
- Use chalk for colored output in CLI
- Use ora for loading spinners

### File Operations
- Always use fs.promises for async file operations
- Create directories with `{ recursive: true }`
- Handle both global and local installation paths

### Version Management
- Use semver for version comparisons
- Check for updates with update-notifier
- Support version constraints in agent dependencies