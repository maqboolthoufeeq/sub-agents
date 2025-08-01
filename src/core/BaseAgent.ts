/**
 * Base class for all Claude agents
 * Provides common functionality and interface that all agents must implement
 */

import type { AgentMetadata, ValidationResult } from '../types/index.js';

export interface AgentContext {
  projectPath: string;
  config: Record<string, unknown>;
  tools: string[];
  memory: Map<string, unknown>;
}

export interface AgentCapability {
  name: string;
  description: string;
  execute: (context: AgentContext, ...args: unknown[]) => Promise<unknown>;
}

export abstract class BaseAgent {
  protected metadata: AgentMetadata;
  protected capabilities: Map<string, AgentCapability>;
  protected context: AgentContext;

  constructor(metadata: AgentMetadata) {
    this.metadata = metadata;
    this.capabilities = new Map();
    this.context = {
      projectPath: process.cwd(),
      config: {},
      tools: metadata.tools || [],
      memory: new Map(),
    };
    
    this.initializeCapabilities();
  }

  /**
   * Initialize agent capabilities - must be implemented by derived classes
   */
  protected abstract initializeCapabilities(): void;

  /**
   * Execute the main agent task
   */
  public abstract execute(task: string, options?: Record<string, unknown>): Promise<unknown>;

  /**
   * Validate the agent configuration and environment
   */
  public abstract validate(): Promise<ValidationResult>;

  /**
   * Get agent metadata
   */
  public getMetadata(): AgentMetadata {
    return { ...this.metadata };
  }

  /**
   * Get available capabilities
   */
  public getCapabilities(): string[] {
    return Array.from(this.capabilities.keys());
  }

  /**
   * Execute a specific capability
   */
  public async executeCapability(
    capabilityName: string,
    ...args: unknown[]
  ): Promise<unknown> {
    const capability = this.capabilities.get(capabilityName);
    if (!capability) {
      throw new Error(`Capability '${capabilityName}' not found in agent ${this.metadata.name}`);
    }
    
    return capability.execute(this.context, ...args);
  }

  /**
   * Update agent context
   */
  public updateContext(updates: Partial<AgentContext>): void {
    this.context = {
      ...this.context,
      ...updates,
    };
  }

  /**
   * Get current context
   */
  public getContext(): AgentContext {
    return { ...this.context };
  }

  /**
   * Add a new capability at runtime
   */
  protected addCapability(capability: AgentCapability): void {
    this.capabilities.set(capability.name, capability);
  }

  /**
   * Remove a capability
   */
  protected removeCapability(capabilityName: string): void {
    this.capabilities.delete(capabilityName);
  }

  /**
   * Check if agent has a specific tool
   */
  protected hasTool(toolName: string): boolean {
    return this.context.tools.includes(toolName);
  }

  /**
   * Store data in agent memory
   */
  protected remember(key: string, value: unknown): void {
    this.context.memory.set(key, value);
  }

  /**
   * Retrieve data from agent memory
   */
  protected recall(key: string): unknown | undefined {
    return this.context.memory.get(key);
  }

  /**
   * Clear agent memory
   */
  protected forget(key?: string): void {
    if (key) {
      this.context.memory.delete(key);
    } else {
      this.context.memory.clear();
    }
  }
}