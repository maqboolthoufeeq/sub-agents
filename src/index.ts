// Main exports for programmatic usage
export { AgentManager } from './core/AgentManager.js';
export { ConfigManager } from './core/ConfigManager.js';
export { CategoryManager } from './core/CategoryManager.js';
export { BackupManager } from './core/BackupManager.js';

// Export types
export type {
  Agent,
  AgentMetadata,
  Category,
  Config,
  InstallOptions,
  UpdateOptions,
  ListOptions,
  SearchOptions,
  ValidationResult,
} from './types/index.js';