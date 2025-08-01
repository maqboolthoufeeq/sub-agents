import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { glob } from 'glob';
import matter from 'gray-matter';
import semver from 'semver';
import { fileURLToPath } from 'url';
import type { Agent, AgentMetadata, ValidationResult } from '../types/index.js';
import { ConfigManager } from './ConfigManager.js';
import { BackupManager } from './BackupManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class AgentManager {
  private configManager: ConfigManager;
  private backupManager: BackupManager;
  private globalAgentsPath: string;
  private localAgentsPath: string;
  private bundledAgentsPath: string;

  constructor() {
    this.configManager = new ConfigManager();
    this.backupManager = new BackupManager();
    this.globalAgentsPath = join(homedir(), '.claude', 'agents');
    this.localAgentsPath = join(process.cwd(), '.claude', 'agents');
    this.bundledAgentsPath = join(__dirname, '..', '..', 'agents');
  }

  async initialize(): Promise<void> {
    // Ensure agent directories exist
    await fs.mkdir(this.globalAgentsPath, { recursive: true });
    await fs.mkdir(this.localAgentsPath, { recursive: true });
  }

  async listAgents(options: { 
    category?: string; 
    installed?: boolean; 
    available?: boolean; 
  } = {}): Promise<Agent[]> {
    const agents: Agent[] = [];
    
    // Get bundled agents
    const bundledAgents = await this.loadAgentsFromPath(this.bundledAgentsPath, false);
    
    // Get installed agents
    const globalAgents = await this.loadAgentsFromPath(this.globalAgentsPath, true);
    const localAgents = await this.loadAgentsFromPath(this.localAgentsPath, true);
    
    // Merge agents, prioritizing local > global > bundled
    const agentMap = new Map<string, Agent>();
    
    for (const agent of bundledAgents) {
      agentMap.set(agent.name, agent);
    }
    
    for (const agent of globalAgents) {
      const existing = agentMap.get(agent.name);
      if (existing) {
        agent.availableUpdate = existing.version;
      }
      agentMap.set(agent.name, agent);
    }
    
    for (const agent of localAgents) {
      const existing = agentMap.get(agent.name);
      if (existing && !existing.installed) {
        agent.availableUpdate = existing.version;
      }
      agentMap.set(agent.name, agent);
    }
    
    agents.push(...agentMap.values());
    
    // Filter by options
    let filtered = agents;
    
    if (options.category) {
      filtered = filtered.filter(a => a.category === options.category);
    }
    
    if (options.installed !== undefined) {
      filtered = filtered.filter(a => a.installed === options.installed);
    }
    
    if (options.available !== undefined) {
      filtered = filtered.filter(a => !a.installed === options.available);
    }
    
    return filtered;
  }

  async getAgent(name: string): Promise<Agent | null> {
    const agents = await this.listAgents();
    return agents.find(a => a.name === name) || null;
  }

  async installAgent(name: string, options: { 
    global?: boolean; 
    force?: boolean; 
  } = {}): Promise<void> {
    const agent = await this.getAgent(name);
    if (!agent) {
      throw new Error(`Agent "${name}" not found`);
    }

    if (agent.installed && !options.force) {
      throw new Error(`Agent "${name}" is already installed. Use --force to reinstall.`);
    }

    const targetPath = options.global ? this.globalAgentsPath : this.localAgentsPath;
    const categoryPath = join(targetPath, agent.category);
    
    // Backup if configured
    if (this.configManager.get('backupBeforeInstall')) {
      await this.backupManager.createBackup(targetPath);
    }

    // Skip dependency checking - agents handle their own dependencies

    // Check conflicts
    if (agent.conflicts) {
      for (const conflict of agent.conflicts) {
        const conflictAgent = await this.getAgent(conflict);
        if (conflictAgent?.installed) {
          throw new Error(`Conflicts with installed agent "${conflict}"`);
        }
      }
    }

    // Create category directory
    await fs.mkdir(categoryPath, { recursive: true });

    // Copy agent file
    const sourcePath = agent.path;
    const targetFile = join(categoryPath, `${agent.name}.md`);
    await fs.copyFile(sourcePath, targetFile);
  }

  async uninstallAgent(name: string): Promise<void> {
    const agent = await this.getAgent(name);
    if (!agent || !agent.installed) {
      throw new Error(`Agent "${name}" is not installed`);
    }

    // Check if other agents depend on this
    const allAgents = await this.listAgents({ installed: true });
    for (const otherAgent of allAgents) {
      if (otherAgent.dependencies?.includes(name)) {
        throw new Error(`Cannot uninstall: Agent "${otherAgent.name}" depends on "${name}"`);
      }
    }

    await fs.unlink(agent.path);
  }

  async updateAgent(name: string, options: { force?: boolean } = {}): Promise<void> {
    const agent = await this.getAgent(name);
    if (!agent || !agent.installed) {
      throw new Error(`Agent "${name}" is not installed`);
    }

    if (!agent.availableUpdate) {
      throw new Error(`No updates available for agent "${name}"`);
    }

    if (!options.force && semver.lte(agent.availableUpdate, agent.installedVersion || agent.version)) {
      throw new Error(`Agent "${name}" is already up to date`);
    }

    // Reinstall with latest version
    await this.installAgent(name, { force: true, global: agent.path.includes(this.globalAgentsPath) });
  }

  async validateAgent(agentPath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const content = await fs.readFile(agentPath, 'utf-8');
      const { data, content: markdown } = matter(content);
      const metadata = data as AgentMetadata;

      // Required fields
      const requiredFields = ['name', 'category', 'description', 'version', 'author', 'license'];
      for (const field of requiredFields) {
        if (!metadata[field as keyof AgentMetadata]) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      // Validate version
      if (metadata.version && !semver.valid(metadata.version)) {
        errors.push(`Invalid version format: ${metadata.version}`);
      }

      // Validate category
      const validCategories = ['frontend', 'backend', 'cloud-devops', 'automation', 'database', 'ai-ml', 'generic'];
      if (metadata.category && !validCategories.includes(metadata.category)) {
        errors.push(`Invalid category: ${metadata.category}. Must be one of: ${validCategories.join(', ')}`);
      }

      // Validate tools
      if (!metadata.tools || metadata.tools.length === 0) {
        warnings.push('No tools specified');
      }

      // Validate content
      if (!markdown || markdown.trim().length < 100) {
        warnings.push('Agent description content is too short (minimum 100 characters)');
      }

      const agent: Agent = {
        ...metadata,
        content: markdown,
        path: agentPath,
      };

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        agent,
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Failed to read agent file: ${error.message}`],
        warnings,
      };
    }
  }

  async searchAgents(query: string, options: { 
    category?: string; 
    tags?: string[]; 
    limit?: number; 
  } = {}): Promise<Agent[]> {
    const agents = await this.listAgents({ category: options.category });
    
    const searchTerms = query.toLowerCase().split(' ');
    
    return agents
      .filter(agent => {
        // Filter by tags if specified
        if (options.tags && options.tags.length > 0) {
          const agentTags = agent.tags || [];
          if (!options.tags.some(tag => agentTags.includes(tag))) {
            return false;
          }
        }
        
        // Search in name, description, tags, and keywords
        const searchableText = [
          agent.name,
          agent.description,
          ...(agent.tags || []),
          ...(agent.keywords || []),
        ].join(' ').toLowerCase();
        
        return searchTerms.every(term => searchableText.includes(term));
      })
      .slice(0, options.limit || 20);
  }

  private async loadAgentsFromPath(basePath: string, installed: boolean): Promise<Agent[]> {
    const agents: Agent[] = [];
    
    try {
      const pattern = join(basePath, '**', '*.md');
      const files = await glob(pattern);
      
      for (const file of files) {
        // Skip files in the commons directory
        if (file.includes('/commons/') || file.includes('\\commons\\')) {
          continue;
        }
        
        const validation = await this.validateAgent(file);
        if (validation.valid && validation.agent) {
          validation.agent.installed = installed;
          if (installed) {
            validation.agent.installedVersion = validation.agent.version;
          }
          agents.push(validation.agent);
        }
      }
    } catch (error) {
      // Directory might not exist, which is fine
    }
    
    return agents;
  }
}