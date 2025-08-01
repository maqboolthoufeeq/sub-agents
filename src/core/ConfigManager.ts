import Configstore from 'configstore';
import { join } from 'path';
import { homedir } from 'os';
import type { Config } from '../types/index.js';

export class ConfigManager {
  private store: Configstore;
  private defaults: Config;

  constructor() {
    this.defaults = {
      installPath: join(homedir(), '.claude', 'agents'),
      autoUpdate: true,
      telemetry: false,
      registry: 'https://registry.sub-agents.io',
      backupBeforeInstall: true,
      colorOutput: true,
      preferGlobal: false,
    };

    this.store = new Configstore('sub-agents', this.defaults);
  }

  get<K extends keyof Config>(key: K): Config[K] {
    return this.store.get(key) as Config[K];
  }

  set<K extends keyof Config>(key: K, value: Config[K]): void {
    this.store.set(key, value);
  }

  getAll(): Config {
    return this.store.all as Config;
  }

  reset(): void {
    this.store.clear();
    Object.entries(this.defaults).forEach(([key, value]) => {
      this.store.set(key, value);
    });
  }

  has(key: keyof Config): boolean {
    return this.store.has(key);
  }

  delete(key: keyof Config): void {
    this.store.delete(key);
  }

  getConfigPath(): string {
    return this.store.path;
  }
}