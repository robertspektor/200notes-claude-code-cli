import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { Config, ProjectConfig } from '../types';

export class ConfigManager {
  private static readonly GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.config', '200notes');
  private static readonly GLOBAL_CONFIG_FILE = path.join(ConfigManager.GLOBAL_CONFIG_DIR, 'config.json');
  private static readonly PROJECT_CONFIG_FILE = '.200notes.json';

  // Global configuration management
  static async getGlobalConfig(): Promise<Config | null> {
    try {
      if (await fs.pathExists(ConfigManager.GLOBAL_CONFIG_FILE)) {
        const config = await fs.readJson(ConfigManager.GLOBAL_CONFIG_FILE);
        return config;
      }
      return null;
    } catch (error) {
      console.error('Error reading global config:', error);
      return null;
    }
  }

  static async setGlobalConfig(config: Config): Promise<void> {
    try {
      await fs.ensureDir(ConfigManager.GLOBAL_CONFIG_DIR);
      await fs.writeJson(ConfigManager.GLOBAL_CONFIG_FILE, config, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to save global config: ${error}`);
    }
  }

  static async updateGlobalConfig(updates: Partial<Config>): Promise<void> {
    const currentConfig = await ConfigManager.getGlobalConfig() || {
      apiKey: '',
      apiSecret: '',
      baseUrl: 'https://200notes.com'
    };

    const newConfig = { ...currentConfig, ...updates };
    await ConfigManager.setGlobalConfig(newConfig);
  }

  static async hasValidGlobalConfig(): Promise<boolean> {
    const config = await ConfigManager.getGlobalConfig();
    return !!(config?.apiKey && config?.apiSecret);
  }

  // Project configuration management
  static async getProjectConfig(projectDir?: string): Promise<ProjectConfig | null> {
    const configPath = path.join(projectDir || process.cwd(), ConfigManager.PROJECT_CONFIG_FILE);
    
    try {
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        return config;
      }
      return null;
    } catch (error) {
      console.error('Error reading project config:', error);
      return null;
    }
  }

  static async setProjectConfig(config: ProjectConfig, projectDir?: string): Promise<void> {
    const configPath = path.join(projectDir || process.cwd(), ConfigManager.PROJECT_CONFIG_FILE);
    
    try {
      await fs.writeJson(configPath, config, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to save project config: ${error}`);
    }
  }

  static async updateProjectConfig(updates: Partial<ProjectConfig>, projectDir?: string): Promise<void> {
    const currentConfig = await ConfigManager.getProjectConfig(projectDir);
    
    if (!currentConfig) {
      throw new Error('No project configuration found. Run "200notes init" first.');
    }

    const newConfig = { ...currentConfig, ...updates };
    await ConfigManager.setProjectConfig(newConfig, projectDir);
  }

  static async hasProjectConfig(projectDir?: string): Promise<boolean> {
    const config = await ConfigManager.getProjectConfig(projectDir);
    return !!config?.projectId;
  }

  // Combined configuration for API client
  static async getApiConfig(projectDir?: string): Promise<Config | null> {
    const globalConfig = await ConfigManager.getGlobalConfig();
    const projectConfig = await ConfigManager.getProjectConfig(projectDir);

    if (!globalConfig) {
      return null;
    }

    return {
      ...globalConfig,
      projectId: projectConfig?.projectId,
    };
  }

  // Environment variable fallbacks
  static getConfigFromEnv(): Partial<Config> {
    return {
      apiKey: process.env.NOTES_API_KEY || '',
      apiSecret: process.env.NOTES_API_SECRET || '',
      baseUrl: process.env.NOTES_BASE_URL || 'https://200notes.com',
    };
  }

  // Validation
  static validateConfig(config: Partial<Config>): string[] {
    const errors: string[] = [];

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (!config.apiSecret) {
      errors.push('API secret is required');
    }

    if (!config.baseUrl) {
      errors.push('Base URL is required');
    } else if (!ConfigManager.isValidUrl(config.baseUrl)) {
      errors.push('Base URL must be a valid URL');
    }

    return errors;
  }

  static validateProjectConfig(config: Partial<ProjectConfig>): string[] {
    const errors: string[] = [];

    if (!config.projectId) {
      errors.push('Project ID is required');
    }

    if (!config.name) {
      errors.push('Project name is required');
    }

    return errors;
  }

  private static isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  // Cleanup
  static async removeGlobalConfig(): Promise<void> {
    try {
      if (await fs.pathExists(ConfigManager.GLOBAL_CONFIG_FILE)) {
        await fs.remove(ConfigManager.GLOBAL_CONFIG_FILE);
      }
    } catch (error) {
      console.error('Error removing global config:', error);
    }
  }

  static async removeProjectConfig(projectDir?: string): Promise<void> {
    const configPath = path.join(projectDir || process.cwd(), ConfigManager.PROJECT_CONFIG_FILE);
    
    try {
      if (await fs.pathExists(configPath)) {
        await fs.remove(configPath);
      }
    } catch (error) {
      console.error('Error removing project config:', error);
    }
  }
}