export interface AgentMetadata {
  name: string;
  category: string;
  description: string;
  tools: string[];
  tags: string[];
  version: string;
  author: string;
  license: string;
  dependencies?: string[];
  conflicts?: string[];
  keywords?: string[];
  repository?: string;
  homepage?: string;
}

export interface Agent extends AgentMetadata {
  content: string;
  path: string;
  installed?: boolean;
  installedVersion?: string;
  availableUpdate?: string;
}

export interface Category {
  name: string;
  description: string;
  agents: string[];
}

export interface Config {
  installPath: string;
  autoUpdate: boolean;
  telemetry: boolean;
  registry: string;
  backupBeforeInstall: boolean;
  colorOutput: boolean;
  preferGlobal: boolean;
}

export interface InstallOptions {
  categories?: string[];
  agents?: string[];
  interactive?: boolean;
  force?: boolean;
  global?: boolean;
  skipDependencies?: boolean;
}

export interface UpdateOptions {
  agents?: string[];
  all?: boolean;
  force?: boolean;
}

export interface ListOptions {
  category?: string;
  installed?: boolean;
  available?: boolean;
  json?: boolean;
}

export interface SearchOptions {
  category?: string;
  tags?: string[];
  limit?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  agent?: Agent;
}

export interface ProjectConfig extends Config {
  projectName?: string;
  projectType?: string;
  installedAgents?: string[];
  integrations?: {
    [key: string]: {
      name: string;
      enabled: boolean;
      initialized: boolean;
      indexedAt?: string;
    };
  };
}