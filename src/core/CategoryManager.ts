import type { Category } from '../types/index.js';

export class CategoryManager {
  private categories: Map<string, Category>;

  constructor() {
    this.categories = new Map([
      ['generic', {
        name: 'generic',
        description: 'General-purpose software development roles',
        agents: ['senior-software-engineer', 'technical-project-manager', 'qa-automation-tester', 'security-specialist', 'ui-ux-designer'],
      }],
      ['frontend', {
        name: 'frontend',
        description: 'Frontend development specialists for modern web frameworks',
        agents: ['nextjs-developer', 'react-component-builder', 'vue-specialist', 'angular-architect', 'svelte-developer'],
      }],
      ['backend', {
        name: 'backend',
        description: 'Backend development experts for server-side frameworks',
        agents: ['django-developer', 'fastapi-builder', 'express-specialist', 'spring-architect', 'rails-developer', 'nodejs-developer', 'php-developer', 'javascript-developer', 'java-developer', 'python-developer'],
      }],
      ['cloud-devops', {
        name: 'cloud-devops',
        description: 'Cloud infrastructure and DevOps automation specialists',
        agents: ['aws-architect', 'docker-specialist', 'kubernetes-operator', 'terraform-engineer'],
      }],
      ['database', {
        name: 'database',
        description: 'Database design and optimization specialists',
        agents: ['postgres-dba', 'mongodb-specialist', 'redis-expert', 'mysql-optimizer'],
      }],
      ['ai-ml', {
        name: 'ai-ml',
        description: 'AI and machine learning development experts',
        agents: ['pytorch-researcher', 'tensorflow-engineer', 'huggingface-specialist', 'langchain-developer'],
      }],
      ['automation', {
        name: 'automation',
        description: 'Workflow automation and integration experts',
        agents: ['n8n-workflow-builder', 'zapier-integrator', 'make-automation-expert'],
      }],
      ['test', {
        name: 'test',
        description: 'Testing and quality assurance specialists',
        agents: ['test-automation-engineer', 'performance-test-engineer', 'security-test-specialist'],
      }],
      ['mobile', {
        name: 'mobile',
        description: 'Mobile application development experts',
        agents: ['ios-developer', 'android-developer', 'react-native-developer', 'flutter-developer'],
      }],
    ]);
  }

  getAll(): Category[] {
    return Array.from(this.categories.values());
  }

  get(name: string): Category | undefined {
    return this.categories.get(name);
  }

  exists(name: string): boolean {
    return this.categories.has(name);
  }

  getAgentsByCategory(categoryName: string): string[] {
    const category = this.get(categoryName);
    return category ? category.agents : [];
  }

  getCategoryByAgent(agentName: string): string | undefined {
    for (const [name, category] of this.categories.entries()) {
      if (category.agents.includes(agentName)) {
        return name;
      }
    }
    return undefined;
  }

  getAllAgents(): string[] {
    const agents: string[] = [];
    for (const category of this.categories.values()) {
      agents.push(...category.agents);
    }
    return agents;
  }
}