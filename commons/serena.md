---
name: serena-integration
type: addon
description: Semantic code analysis for improved context fetching and optimized token usage
version: 1.0.0
author: Sub-Agents Team
license: MIT
---

# Serena Integration

Serena provides semantic code analysis for improved context fetching and optimized token usage in Claude Code.

## Features

- **Semantic Code Analysis**: Understands your codebase structure and relationships
- **Optimized Token Usage**: Reduces context size by fetching only relevant code
- **Project Memory**: Maintains persistent knowledge about your project structure
- **IDE Assistant Context**: Provides Claude with better understanding of your development environment

## Initialize Serena for Claude Support

### First-time Setup

```bash
# Add the Serena MCP server
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena-mcp-server --context ide-assistant --project $(pwd)

# Index the project
uvx --from git+https://github.com/oraios/serena index-project
```

### Initial Instructions

After setup, read Serena's initial instructions by either:
- Saying "read Serena's initial instructions"
- Running `/mcp__serena__initial_instructions`

## Usage

Once initialized, Serena will automatically:
- Maintain project structure knowledge
- Provide semantic code navigation
- Optimize context for Claude interactions

To read project information:
```
serena - read_memory (MCP)(memory_file_name: "project_structure.md")
```

## Management

### Dashboard
View and manage Serena at: http://127.0.0.1:24282/dashboard/index.html

### Disable Serena
You can turn off Serena from the dashboard when not needed.

## Benefits

1. **Better Code Understanding**: Serena helps Claude understand your codebase structure
2. **Faster Navigation**: Semantic search finds relevant code quickly
3. **Reduced Token Usage**: Only fetches necessary context
4. **Project Memory**: Remembers your project structure across sessions