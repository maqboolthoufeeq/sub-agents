/**
 * React Developer Agent
 * Specialized agent for React development tasks
 */

import { BaseAgent } from '../core/BaseAgent.js';
import type { ValidationResult } from '../types/index.js';

export class ReactDeveloperAgent extends BaseAgent {
  constructor() {
    super({
      name: 'react-developer',
      category: 'frontend',
      description: 'Specialized agent for React development, component creation, and optimization',
      version: '1.0.0',
      author: 'Claude Agents Team',
      license: 'MIT',
      tools: ['file-system', 'code-analysis', 'npm', 'git'],
      tags: ['react', 'frontend', 'javascript', 'typescript', 'ui', 'components'],
      dependencies: ['nodejs', 'npm'],
      keywords: ['react', 'hooks', 'jsx', 'component', 'state-management'],
    });
  }

  protected initializeCapabilities(): void {
    // Component creation capability
    this.addCapability({
      name: 'createComponent',
      description: 'Create a new React component with best practices',
      execute: async (_context, ...args) => {
        const componentName = args[0] as string;
        const options = args[1] as Record<string, unknown> | undefined;
        const { typescript = true, hooks = true, style = 'css-modules' } = options || {};
        
        // Implementation would generate component code here
        const componentCode = this.generateComponentCode(
          componentName,
          { typescript, hooks, style } as any
        );
        
        return {
          success: true,
          componentName,
          code: componentCode,
          path: `src/components/${componentName}`,
        };
      },
    });

    // Hook creation capability
    this.addCapability({
      name: 'createHook',
      description: 'Create a custom React hook',
      execute: async (_context, ...args) => {
        const hookName = args[0] as string;
        const options = args[1] as Record<string, unknown> | undefined;
        const hookCode = this.generateHookCode(hookName, options);
        
        return {
          success: true,
          hookName,
          code: hookCode,
          path: `src/hooks/${hookName}`,
        };
      },
    });

    // Performance optimization capability
    this.addCapability({
      name: 'optimizeComponent',
      description: 'Analyze and optimize React component performance',
      execute: async (_context, ...args) => {
        const componentPath = args[0] as string;
        // Would analyze component and suggest optimizations
        const analysis = await this.analyzeComponent(componentPath);
        const optimizations = this.suggestOptimizations(analysis);
        
        return {
          success: true,
          componentPath,
          analysis,
          optimizations,
        };
      },
    });

    // Testing capability
    this.addCapability({
      name: 'generateTests',
      description: 'Generate unit tests for React components',
      execute: async (_context, ...args) => {
        const componentPath = args[0] as string;
        const options = args[1] as Record<string, unknown> | undefined;
        const { framework = 'jest', library = 'testing-library' } = options || {};
        
        const testCode = this.generateTestCode(
          componentPath,
          { framework, library } as any
        );
        
        return {
          success: true,
          componentPath,
          testCode,
          testPath: componentPath.replace('.tsx', '.test.tsx'),
        };
      },
    });
  }

  public async execute(task: string, options?: Record<string, unknown>): Promise<unknown> {
    // Parse the task and determine which capability to use
    const taskLower = task.toLowerCase();
    
    if (taskLower.includes('create') && taskLower.includes('component')) {
      const componentName = this.extractComponentName(task);
      return this.executeCapability('createComponent', componentName, options);
    }
    
    if (taskLower.includes('create') && taskLower.includes('hook')) {
      const hookName = this.extractHookName(task);
      return this.executeCapability('createHook', hookName, options);
    }
    
    if (taskLower.includes('optimize')) {
      const componentPath = options?.path || this.extractPath(task);
      return this.executeCapability('optimizeComponent', componentPath);
    }
    
    if (taskLower.includes('test')) {
      const componentPath = options?.path || this.extractPath(task);
      return this.executeCapability('generateTests', componentPath, options);
    }
    
    throw new Error(`Unable to understand task: ${task}`);
  }

  public async validate(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for Node.js
    if (!this.hasTool('nodejs')) {
      errors.push('Node.js is required for React development');
    }
    
    // Check for npm or yarn
    if (!this.hasTool('npm') && !this.hasTool('yarn')) {
      errors.push('Package manager (npm or yarn) is required');
    }
    
    // Check for React in project
    const hasReact = await this.checkForReact();
    if (!hasReact) {
      warnings.push('React is not installed in the current project');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      agent: this.getMetadata() as any,
    };
  }

  // Helper methods
  private generateComponentCode(
    name: string,
    options: { typescript: boolean; hooks: boolean; style: string }
  ): string {
    // const extension = options.typescript ? 'tsx' : 'jsx';
    const propsType = options.typescript ? `interface ${name}Props {}\n\n` : '';
    
    return `${propsType}export const ${name}: React.FC${
      options.typescript ? `<${name}Props>` : ''
    } = (${options.typescript ? 'props' : ''}) => {
  ${options.hooks ? 'const [state, setState] = useState();\n' : ''}
  return (
    <div className="${name.toLowerCase()}">
      <h1>${name}</h1>
    </div>
  );
};`;
  }

  private generateHookCode(name: string, _options?: Record<string, unknown>): string {
    return `import { useState, useEffect } from 'react';

export const ${name} = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Hook logic here
  }, []);

  return { data, loading, error };
};`;
  }

  private async analyzeComponent(_path: string): Promise<any> {
    // Would perform actual analysis
    return {
      renderCount: 0,
      stateUpdates: 0,
      effectCount: 0,
      memoization: false,
    };
  }

  private suggestOptimizations(analysis: any): string[] {
    const suggestions: string[] = [];
    
    if (!analysis.memoization) {
      suggestions.push('Consider using React.memo for performance optimization');
    }
    
    if (analysis.renderCount > 10) {
      suggestions.push('Component re-renders frequently, consider optimizing state updates');
    }
    
    return suggestions;
  }

  private generateTestCode(path: string, _options: { framework: string; library: string }): string {
    return `import { render, screen } from '@testing-library/react';
import { ComponentName } from '${path}';

describe('ComponentName', () => {
  it('renders without crashing', () => {
    render(<ComponentName />);
    expect(screen.getByText('ComponentName')).toBeInTheDocument();
  });
});`;
  }

  private extractComponentName(task: string): string {
    const match = task.match(/component\s+(?:called\s+|named\s+)?(\w+)/i);
    return match ? match[1] : 'NewComponent';
  }

  private extractHookName(task: string): string {
    const match = task.match(/hook\s+(?:called\s+|named\s+)?(\w+)/i);
    return match ? match[1] : 'useCustomHook';
  }

  private extractPath(task: string): string {
    const match = task.match(/(?:path|file)\s+(\S+)/i);
    return match ? match[1] : '';
  }

  private async checkForReact(): Promise<boolean> {
    // Would check package.json for React
    return true;
  }
}