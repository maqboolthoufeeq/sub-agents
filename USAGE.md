# Using Claude Agents

## Overview

Claude Agents is a project-level tool that enhances your Claude Code experience by providing specialized AI agents tailored to your project's technology stack. Instead of using generic AI assistance, you get agents that understand your specific frameworks, tools, and best practices.

## Installation Methods

### 1. Using npx (Recommended)

No installation needed! Just run:

```bash
# In your project directory
npx sub-agents init
```

### 2. As a Dev Dependency

```bash
# Install in your project
npm install --save-dev sub-agents

# Initialize
npx sub-agents init
```

## Initialization

When you run `sub-agents init`, it will:

1. **Detect Your Project Type**: Analyzes your project files to identify frameworks and technologies
2. **Suggest Relevant Agents**: Recommends agents based on your stack
3. **Create .claude Directory**: Sets up the local agent configuration
4. **Install Selected Agents**: Copies agent definitions to your project

### Initialization Options

```bash
# Auto-detect and install recommended agents
npx sub-agents init

# Interactive mode - manually select agents
npx sub-agents init --interactive

# Install specific categories
npx sub-agents init --categories=frontend,backend

# Install specific agents
npx sub-agents init --agents=nextjs-developer,postgres-dba

# Force re-initialization
npx sub-agents init --force
```

## Project Structure

After initialization:

```
your-project/
├── .claude/
│   ├── agents/           # Agent definitions
│   │   ├── frontend/     # Frontend framework agents
│   │   ├── backend/      # Backend framework agents
│   │   ├── database/     # Database agents
│   │   └── ...          # Other categories
│   ├── config.json      # Configuration
│   └── README.md        # Documentation
└── ... your project files
```

## Working with Agents

### List Installed Agents

```bash
npx sub-agents list
```

### Add More Agents

```bash
# Interactive selection
npx sub-agents install --interactive

# Install specific agents
npx sub-agents install --agents=docker-specialist,aws-architect
```

### Remove Agents

```bash
npx sub-agents uninstall --agents=agent-name
```

### Search Available Agents

```bash
npx sub-agents search "kubernetes"
npx sub-agents search --category=cloud-devops
```

### Get Agent Details

```bash
npx sub-agents info nextjs-developer
```

## Agent Categories

- **Frontend**: React, Vue, Angular, Svelte, Next.js specialists
- **Backend**: Express, Django, FastAPI, Rails, Spring experts
- **Cloud/DevOps**: AWS, Docker, Kubernetes, Terraform engineers
- **Database**: PostgreSQL, MongoDB, MySQL, Redis specialists
- **AI/ML**: PyTorch, TensorFlow, Hugging Face experts
- **Generic**: Senior engineers, project managers, QA specialists

## Custom Agents

### Create a Custom Agent

1. Generate template:
   ```bash
   npx sub-agents template --output=my-custom-agent.md
   ```

2. Edit the template with your specifications

3. Validate:
   ```bash
   npx sub-agents validate --path=my-custom-agent.md
   ```

4. Install locally:
   ```bash
   cp my-custom-agent.md .claude/agents/custom/
   ```

## Best Practices

1. **Version Control**: 
   - Add `.claude/` to `.gitignore` for personal preferences
   - Or commit it to share team-wide agent configurations

2. **Project-Specific Agents**: 
   - Start with auto-detected agents
   - Add more as your project grows
   - Remove unused agents to keep it clean

3. **Team Collaboration**:
   - Share custom agents via the repository
   - Document agent usage in your project README

## Examples

### Next.js Project

```bash
npx sub-agents init
# Auto-detects Next.js, suggests:
# - nextjs-developer
# - react-component-builder
# - postgres-dba (if using database)
```

### Django Project

```bash
npx sub-agents init
# Auto-detects Django, suggests:
# - django-developer
# - postgres-dba
# - redis-expert
```

### Multi-Stack Project

```bash
npx sub-agents init --interactive
# Manually select agents for:
# - Frontend (React)
# - Backend (Express)
# - Database (MongoDB)
# - DevOps (Docker, K8s)
```

## Troubleshooting

### Agents Not Working

1. Ensure `.claude/agents/` directory exists
2. Check agent files are valid Markdown with YAML frontmatter
3. Validate agents: `npx sub-agents validate`

### Permission Issues

```bash
# If you get permission errors
sudo npx sub-agents init
```

### Update Issues

```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm install --save-dev sub-agents@latest
```

## Integration with Claude Code

Once agents are installed in your project, Claude Code automatically detects and uses them. The agents provide:

- Framework-specific guidance
- Best practices for your stack
- Code examples using your dependencies
- Architecture recommendations
- Performance optimization tips

## Support

- GitHub Issues: https://github.com/maqboolthoufeeq/sub-agents
- Community: https://discord.gg/MYtHXRGtXE