---
name: commons-init
type: system
description: Initialization logic for optional integrations
version: 1.0.0
---

# Commons Initialization

This file manages the initialization of optional integrations for sub-agents.

## Available Integrations

### Serena - Semantic Code Analysis
- Enhanced context understanding
- Optimized token usage
- Project structure memory
- IDE assistant capabilities

## Integration Process

1. **Detection**: Check if integration is already initialized
2. **Installation**: Run integration-specific setup commands
3. **Configuration**: Configure integration for the project
4. **Verification**: Ensure integration is working properly

## Integration Status

The system maintains integration status in `.claude/config.json`:

```json
{
  "integrations": {
    "serena": {
      "enabled": true,
      "initialized": true,
      "indexedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```