---
name: serena-manual-setup
type: guide
description: Manual setup instructions for Serena without Claude CLI
version: 1.0.0
author: Sub-Agents Team
license: MIT
---

# Manual Serena Setup Guide

If you cannot install the Claude CLI or prefer manual setup, follow these instructions to configure Serena for your project.

## Option 1: Standalone Serena Usage

You can use Serena independently without the Claude CLI integration:

### 1. Install Serena
```bash
# Using pip
pip install git+https://github.com/oraios/serena

# Or using uv
uv pip install git+https://github.com/oraios/serena
```

### 2. Index Your Project
```bash
# Navigate to your project root
cd /path/to/your/project

# Run Serena indexing
uvx --from git+https://github.com/oraios/serena serena project index
```

### 3. Use Serena Commands
```bash
# Start the MCP server
uvx --from git+https://github.com/oraios/serena serena start-mcp-server

# The dashboard will be available at:
# http://localhost:24282/dashboard/index.html
```

## Option 2: Docker Setup

For isolated environments, use Serena in Docker:

```dockerfile
FROM python:3.11-slim

# Install Serena
RUN pip install git+https://github.com/oraios/serena

# Set working directory
WORKDIR /app

# Copy your project
COPY . .

# Index on build
RUN uvx --from git+https://github.com/oraios/serena serena project index

# Run Serena MCP server
CMD ["uvx", "--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server"]
```

## Option 3: Project-Specific Configuration

Create a `.serena/config.json` in your project root:

```json
{
  "project_name": "your-project",
  "index_paths": ["src", "lib", "tests"],
  "exclude_patterns": ["**/node_modules", "**/.git", "**/dist"],
  "context_size": 8192,
  "enable_semantic_search": true
}
```

## Using Serena with Claude (Manual)

When Claude asks about your codebase, you can manually provide Serena's output:

1. **Start the MCP server**:
   ```bash
   uvx --from git+https://github.com/oraios/serena serena start-mcp-server
   ```

2. **Access the dashboard**:
   Open http://localhost:24282/dashboard/index.html in your browser

3. **Copy the output** and paste it into your Claude conversation when needed.

## Benefits of Manual Setup

- No dependency on Claude CLI
- Works in restricted environments
- Full control over indexing
- Can be integrated into CI/CD pipelines
- Portable across different systems

## Troubleshooting

### Common Issues

1. **Import errors**: Ensure Serena is in your Python path
2. **Indexing fails**: Check file permissions and path exclusions
3. **Memory issues**: Limit index size with exclude patterns
4. **Performance**: Use SSD storage for index files

### Getting Help

- Serena GitHub: https://github.com/oraios/serena
- Report issues: https://github.com/oraios/serena/issues
- Community Discord: [Join Discord](https://discord.gg/serena-community)

## Next Steps

After manual setup:
1. Test Serena commands work correctly
2. Set up aliases for common operations
3. Create scripts for your workflow
4. Document your team's usage patterns