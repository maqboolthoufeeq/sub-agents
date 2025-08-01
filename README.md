# Sub-Agents

[![npm version](https://img.shields.io/npm/v/sub-agents.svg)](https://www.npmjs.com/package/sub-agents)
[![npm downloads](https://img.shields.io/npm/dm/sub-agents.svg)](https://www.npmjs.com/package/sub-agents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/sub-agents.svg)](https://nodejs.org)

Initialize and manage specialized AI agents for Claude Code in your project. Get tailored AI assistance based on your project's technology stack.

**\ud83d\udce6 This is a CLI tool meant to be used with `npx`, not installed as a project dependency.**

## Installation

⚠️ **Important**: This tool is designed to be used with `npx`, not installed as a dependency.

```bash
# ✅ Correct usage
npx sub-agents init

# ❌ Do NOT install with npm/yarn
# npm install sub-agents  # This won't work as expected
```

## Quick Start

Initialize sub-agents in your project:

```bash
npx sub-agents init
```

Or with specific options:

```bash
# Interactive mode
npx sub-agents init --interactive

# Auto-detect and install relevant agents
npx sub-agents init

# Install specific categories
npx sub-agents init --categories=frontend,backend

# Install specific agents
npx sub-agents init --agents=nextjs-developer,postgres-dba
```

## How It Works

1. **Project Detection**: Automatically detects your project type (Next.js, Django, Express, etc.)
2. **Agent Selection**: Suggests relevant AI agents based on your stack
3. **Local Installation**: Installs agents in `.claude/agents/` directory
4. **Claude Integration**: Agents are automatically available when using Claude Code

## Project Structure

After initialization, your project will have:

```
your-project/
├── .claude/
│   ├── agents/          # Installed agent configurations
│   ├── templates/       # Custom agent templates
│   ├── config.json      # Project configuration
│   └── README.md        # Agent documentation
└── ... your project files
```

## Features

- **Smart Project Detection**: Automatically identifies your tech stack
- **Curated Agent Library**: 25+ specialized agents for different technologies
- **Project-Specific**: Each project gets its own agent configuration
- **Easy Management**: Add, remove, or update agents as your project evolves
- **Custom Agents**: Create project-specific custom agents
- **Git-Friendly**: `.claude/` directory can be gitignored or committed

## Commands

### Initialization
```bash
# Initialize with auto-detection
npx sub-agents init

# Interactive initialization
npx sub-agents init --interactive

# Force re-initialization
npx sub-agents init --force
```

### Agent Management
```bash
# List installed agents
npx sub-agents list

# Install additional agents (interactive by default)
npx sub-agents install
npx sub-agents install --agents=docker-specialist,kubernetes-operator

# Remove agents
npx sub-agents uninstall --agents=agent-name

# Update agents
npx sub-agents update --all
```

### Discovery Commands
- `npx sub-agents categories` - List all available agent categories
- `npx sub-agents search <query>` - Search for agents
- `npx sub-agents info <agent-name>` - Show agent details

### Development Commands
- `npx sub-agents create` - Create new agent definition
- `npx sub-agents template` - Generate agent template
- `npx sub-agents validate` - Validate agent files
- `npx sub-agents publish` - Publish custom agents

### Configuration
- `npx sub-agents config` - Manage configuration

## Agent Categories

View all categories with `npx sub-agents categories`

- **Generic**: Senior engineers, architects, managers, QA specialists
- **Frontend**: React, Vue, Angular, Svelte, Next.js specialists
- **Backend**: Express, Django, Rails, Spring, FastAPI experts
- **Cloud/DevOps**: AWS, Docker, Kubernetes, Terraform engineers
- **Database**: PostgreSQL, MongoDB, MySQL, Redis specialists
- **AI/ML**: PyTorch, TensorFlow, Hugging Face researchers
- **Automation**: n8n, Zapier, Make workflow builders

## Creating Custom Agents

1. Generate a template:
```bash
npx sub-agents template -o my-agent.md
```

2. Edit the template with your agent definition

3. Validate your agent:
```bash
npx sub-agents validate --path=my-agent.md
```

4. Install locally for testing:
```bash
npx sub-agents install --agents=my-agent --path=.
```

5. Publish to registry:
```bash
npx sub-agents publish my-agent.md
```

## Configuration

Claude Agents can be configured globally or per-project:

```bash
# Set default registry
npx sub-agents config set registry https://registry.sub-agents.io

# Enable auto-updates
npx sub-agents config set autoUpdate true

# View all settings
npx sub-agents config list
```

## Project Structure

Agents are stored in:
- Global: `~/.claude/agents/`
- Project: `.claude/agents/`

## Agent Definition Format

Agents are defined as Markdown files with YAML frontmatter:

```yaml
---
name: my-agent
category: backend
description: Brief description
version: 1.0.0
author: Your Name
license: MIT
tools:
  - Read
  - Write
  - Bash
tags:
  - nodejs
  - api
---

# Agent Name

Detailed description and documentation...
```

## Contributing

Contributions are welcome! Please read our contributing guidelines.

## License

MIT License - see LICENSE file for details