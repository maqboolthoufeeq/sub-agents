---
name: docker-setup
type: guide
description: Guide for using sub-agents in Docker containers
version: 1.0.0
author: Sub-Agents Team
license: MIT
---

# Docker Setup Guide for Sub-Agents

This guide helps you set up sub-agents with all integrations in Docker containers.

## Quick Setup

### Option 1: Dockerfile with Dependencies

Create a Dockerfile with all required dependencies:

```dockerfile
FROM node:18-alpine

# Install required tools
RUN apk add --no-cache git curl bash

# Install UV tool
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Install Claude CLI (optional, for full integration)
# RUN npm install -g @anthropic/claude-cli

WORKDIR /app

# Copy your project files
COPY . .

# Initialize sub-agents
RUN npx sub-agents init --non-interactive

# Install Serena integration
RUN npx sub-agents integrations --install serena

CMD ["npm", "start"]
```

### Option 2: Add Dependencies to Existing Container

If you're already in a running container:

```bash
# For Alpine-based containers (most Node.js images)
apk add git

# For Ubuntu/Debian-based containers
apt-get update && apt-get install -y git

# For CentOS/RHEL-based containers
yum install git

# Then install UV (already handled by sub-agents)
# And run the integration
npx sub-agents integrations --install serena
```

## Docker Compose Example

```yaml
version: '3.8'
services:
  app:
    build: .
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
```

## Pre-built Images

Consider using Node.js images that include Git:

```dockerfile
# Option 1: Official Node with Git
FROM node:18

# Option 2: Alpine with Git pre-installed
FROM node:18-alpine
RUN apk add --no-cache git
```

## Troubleshooting

### Missing Git Error
If you see "Git executable not found":
1. Install Git: `apk add git` (Alpine) or `apt-get install git` (Debian)
2. Re-run the integration command

### Permission Issues
If you encounter permission errors:
```bash
# Run as root temporarily
docker exec -u root <container> sh
# Install dependencies
# Switch back to regular user
```

### PATH Issues
If UV is installed but not found:
```bash
export PATH="$HOME/.local/bin:$PATH"
# Or for root
export PATH="/root/.local/bin:$PATH"
```

## Best Practices

1. **Multi-stage Builds**: Install dependencies in build stage
2. **Cache Dependencies**: Use Docker layer caching
3. **Non-root User**: Run as non-root when possible
4. **Volume Mounts**: Mount code for development
5. **Environment Variables**: Use .env files

## Complete Example

Here's a complete setup for a Next.js project:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Development stage
FROM node:18-alpine AS development
RUN apk add --no-cache git curl bash
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx sub-agents init
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

## Security Considerations

1. **Minimal Images**: Use Alpine for smaller attack surface
2. **Specific Versions**: Pin versions instead of using 'latest'
3. **Security Scanning**: Scan images for vulnerabilities
4. **Secrets Management**: Never commit sensitive data

## Next Steps

After setting up Docker:
1. Initialize sub-agents: `npx sub-agents init`
2. Install agents: `npx sub-agents install --interactive`
3. Set up integrations: `npx sub-agents integrations --install serena`
4. Start developing with enhanced AI assistance!