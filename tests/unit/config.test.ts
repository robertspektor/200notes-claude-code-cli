import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../../src/lib/config';
import { Config, ProjectConfig } from '../../src/types';
import { testHelpers, TEST_CONFIG } from '../setup';

describe('ConfigManager', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await testHelpers.createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Clear environment variables
    delete process.env.NOTES_API_KEY;
    delete process.env.NOTES_API_SECRET;
    delete process.env.NOTES_BASE_URL;
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up temp directory
    await testHelpers.cleanupTempDir(tempDir);
  });

  describe('Global Configuration', () => {
    describe('getGlobalConfig', () => {
      it('should return null when no config exists', async () => {
        const config = await ConfigManager.getGlobalConfig();
        expect(config).toBeNull();
      });

      it('should return config when file exists', async () => {
        const testConfig: Config = {
          apiKey: TEST_CONFIG.TEST_API_KEY,
          apiSecret: TEST_CONFIG.TEST_API_SECRET,
          baseUrl: TEST_CONFIG.API_BASE_URL
        };

        // Create config directory and file
        const configDir = path.join(os.homedir(), '.config', '200notes');
        const configFile = path.join(configDir, 'config.json');
        await fs.ensureDir(configDir);
        await fs.writeJson(configFile, testConfig);

        const config = await ConfigManager.getGlobalConfig();
        expect(config).toEqual(testConfig);

        // Cleanup
        await fs.remove(configDir);
      });
    });

    describe('setGlobalConfig', () => {
      it('should save global configuration', async () => {
        const testConfig: Config = {
          apiKey: TEST_CONFIG.TEST_API_KEY,
          apiSecret: TEST_CONFIG.TEST_API_SECRET,
          baseUrl: TEST_CONFIG.API_BASE_URL
        };

        await ConfigManager.setGlobalConfig(testConfig);

        const savedConfig = await ConfigManager.getGlobalConfig();
        expect(savedConfig).toEqual(testConfig);

        // Cleanup
        const configDir = path.join(os.homedir(), '.config', '200notes');
        await fs.remove(configDir);
      });

      it('should create config directory if it does not exist', async () => {
        const testConfig: Config = {
          apiKey: TEST_CONFIG.TEST_API_KEY,
          apiSecret: TEST_CONFIG.TEST_API_SECRET,
          baseUrl: TEST_CONFIG.API_BASE_URL
        };

        const configDir = path.join(os.homedir(), '.config', '200notes');
        
        // Ensure directory doesn't exist
        if (await fs.pathExists(configDir)) {
          await fs.remove(configDir);
        }

        await ConfigManager.setGlobalConfig(testConfig);

        expect(await fs.pathExists(configDir)).toBe(true);

        // Cleanup
        await fs.remove(configDir);
      });
    });

    describe('updateGlobalConfig', () => {
      it('should update existing configuration', async () => {
        const initialConfig: Config = {
          apiKey: 'old_key',
          apiSecret: 'old_secret',
          baseUrl: 'http://old-url.com'
        };

        await ConfigManager.setGlobalConfig(initialConfig);

        const updates = {
          apiKey: 'new_key',
          baseUrl: 'http://new-url.com'
        };

        await ConfigManager.updateGlobalConfig(updates);

        const updatedConfig = await ConfigManager.getGlobalConfig();
        expect(updatedConfig).toEqual({
          apiKey: 'new_key',
          apiSecret: 'old_secret', // Should remain unchanged
          baseUrl: 'http://new-url.com'
        });

        // Cleanup
        const configDir = path.join(os.homedir(), '.config', '200notes');
        await fs.remove(configDir);
      });

      it('should create new configuration if none exists', async () => {
        const updates = {
          apiKey: TEST_CONFIG.TEST_API_KEY,
          apiSecret: TEST_CONFIG.TEST_API_SECRET
        };

        await ConfigManager.updateGlobalConfig(updates);

        const config = await ConfigManager.getGlobalConfig();
        expect(config).toEqual({
          apiKey: TEST_CONFIG.TEST_API_KEY,
          apiSecret: TEST_CONFIG.TEST_API_SECRET,
          baseUrl: 'https://200notes.com'
        });

        // Cleanup
        const configDir = path.join(os.homedir(), '.config', '200notes');
        await fs.remove(configDir);
      });
    });

    describe('hasValidGlobalConfig', () => {
      it('should return false when no config exists', async () => {
        const result = await ConfigManager.hasValidGlobalConfig();
        expect(result).toBe(false);
      });

      it('should return false when config is incomplete', async () => {
        const incompleteConfig = {
          apiKey: TEST_CONFIG.TEST_API_KEY,
          // Missing apiSecret
          baseUrl: TEST_CONFIG.API_BASE_URL
        };

        await ConfigManager.setGlobalConfig(incompleteConfig as Config);

        const result = await ConfigManager.hasValidGlobalConfig();
        expect(result).toBe(false);

        // Cleanup
        const configDir = path.join(os.homedir(), '.config', '200notes');
        await fs.remove(configDir);
      });

      it('should return true when config is valid', async () => {
        const validConfig: Config = {
          apiKey: TEST_CONFIG.TEST_API_KEY,
          apiSecret: TEST_CONFIG.TEST_API_SECRET,
          baseUrl: TEST_CONFIG.API_BASE_URL
        };

        await ConfigManager.setGlobalConfig(validConfig);

        const result = await ConfigManager.hasValidGlobalConfig();
        expect(result).toBe(true);

        // Cleanup
        const configDir = path.join(os.homedir(), '.config', '200notes');
        await fs.remove(configDir);
      });
    });
  });

  describe('Project Configuration', () => {
    describe('getProjectConfig', () => {
      it('should return null when no project config exists', async () => {
        const config = await ConfigManager.getProjectConfig();
        expect(config).toBeNull();
      });

      it('should return project config when file exists', async () => {
        const testConfig: ProjectConfig = {
          projectId: TEST_CONFIG.TEST_PROJECT_ID,
          name: 'Test Project',
          lastSync: new Date().toISOString(),
          taskMappings: {}
        };

        await fs.writeJson('.200notes.json', testConfig);

        const config = await ConfigManager.getProjectConfig();
        expect(config).toEqual(testConfig);
      });

      it('should read config from specified directory', async () => {
        const subDir = path.join(tempDir, 'subproject');
        await fs.ensureDir(subDir);

        const testConfig: ProjectConfig = {
          projectId: 'sub-project-123',
          name: 'Sub Project',
          lastSync: new Date().toISOString(),
          taskMappings: {}
        };

        const configPath = path.join(subDir, '.200notes.json');
        await fs.writeJson(configPath, testConfig);

        const config = await ConfigManager.getProjectConfig(subDir);
        expect(config).toEqual(testConfig);
      });
    });

    describe('setProjectConfig', () => {
      it('should save project configuration', async () => {
        const testConfig: ProjectConfig = {
          projectId: TEST_CONFIG.TEST_PROJECT_ID,
          name: 'Test Project',
          lastSync: new Date().toISOString(),
          taskMappings: {
            'src/': [1, 2, 3]
          }
        };

        await ConfigManager.setProjectConfig(testConfig);

        const savedConfig = await ConfigManager.getProjectConfig();
        expect(savedConfig).toEqual(testConfig);
      });
    });

    describe('updateProjectConfig', () => {
      it('should update existing project configuration', async () => {
        const initialConfig: ProjectConfig = {
          projectId: TEST_CONFIG.TEST_PROJECT_ID,
          name: 'Initial Project',
          lastSync: new Date('2023-01-01').toISOString(),
          taskMappings: {}
        };

        await ConfigManager.setProjectConfig(initialConfig);

        const updates = {
          name: 'Updated Project',
          lastSync: new Date().toISOString()
        };

        await ConfigManager.updateProjectConfig(updates);

        const updatedConfig = await ConfigManager.getProjectConfig();
        expect(updatedConfig?.name).toBe('Updated Project');
        expect(updatedConfig?.projectId).toBe(TEST_CONFIG.TEST_PROJECT_ID);
      });

      it('should throw error when no project config exists', async () => {
        const updates = { name: 'New Name' };

        await expect(ConfigManager.updateProjectConfig(updates))
          .rejects.toThrow('No project configuration found');
      });
    });

    describe('hasProjectConfig', () => {
      it('should return false when no project config exists', async () => {
        const result = await ConfigManager.hasProjectConfig();
        expect(result).toBe(false);
      });

      it('should return true when project config exists', async () => {
        await testHelpers.createMockConfig();

        const result = await ConfigManager.hasProjectConfig();
        expect(result).toBe(true);
      });
    });
  });

  describe('Combined Configuration', () => {
    describe('getApiConfig', () => {
      it('should combine global and project config', async () => {
        const globalConfig: Config = {
          apiKey: TEST_CONFIG.TEST_API_KEY,
          apiSecret: TEST_CONFIG.TEST_API_SECRET,
          baseUrl: TEST_CONFIG.API_BASE_URL
        };

        const projectConfig: ProjectConfig = {
          projectId: TEST_CONFIG.TEST_PROJECT_ID,
          name: 'Test Project',
          lastSync: new Date().toISOString(),
          taskMappings: {}
        };

        await ConfigManager.setGlobalConfig(globalConfig);
        await ConfigManager.setProjectConfig(projectConfig);

        const apiConfig = await ConfigManager.getApiConfig();

        expect(apiConfig).toEqual({
          ...globalConfig,
          projectId: TEST_CONFIG.TEST_PROJECT_ID
        });

        // Cleanup
        const configDir = path.join(os.homedir(), '.config', '200notes');
        await fs.remove(configDir);
      });

      it('should return null when global config is missing', async () => {
        await testHelpers.createMockConfig();

        const apiConfig = await ConfigManager.getApiConfig();
        expect(apiConfig).toBeNull();
      });
    });
  });

  describe('Environment Variable Support', () => {
    describe('getConfigFromEnv', () => {
      it('should read configuration from environment variables', () => {
        process.env.NOTES_API_KEY = 'env_key';
        process.env.NOTES_API_SECRET = 'env_secret';
        process.env.NOTES_BASE_URL = 'http://env-url.com';

        const config = ConfigManager.getConfigFromEnv();

        expect(config).toEqual({
          apiKey: 'env_key',
          apiSecret: 'env_secret',
          baseUrl: 'http://env-url.com'
        });
      });

      it('should use default base URL when not provided', () => {
        process.env.NOTES_API_KEY = 'env_key';
        process.env.NOTES_API_SECRET = 'env_secret';

        const config = ConfigManager.getConfigFromEnv();

        expect(config.baseUrl).toBe('https://200notes.com');
      });
    });
  });

  describe('Validation', () => {
    describe('validateConfig', () => {
      it('should validate complete config', () => {
        const validConfig: Config = {
          apiKey: TEST_CONFIG.TEST_API_KEY,
          apiSecret: TEST_CONFIG.TEST_API_SECRET,
          baseUrl: TEST_CONFIG.API_BASE_URL
        };

        const errors = ConfigManager.validateConfig(validConfig);
        expect(errors).toHaveLength(0);
      });

      it('should return errors for missing fields', () => {
        const incompleteConfig = {
          apiKey: '',
          // Missing apiSecret and baseUrl
        };

        const errors = ConfigManager.validateConfig(incompleteConfig);
        expect(errors).toContain('API key is required');
        expect(errors).toContain('API secret is required');
        expect(errors).toContain('Base URL is required');
      });

      it('should validate URL format', () => {
        const invalidConfig = {
          apiKey: TEST_CONFIG.TEST_API_KEY,
          apiSecret: TEST_CONFIG.TEST_API_SECRET,
          baseUrl: 'not-a-valid-url'
        };

        const errors = ConfigManager.validateConfig(invalidConfig);
        expect(errors).toContain('Base URL must be a valid URL');
      });
    });

    describe('validateProjectConfig', () => {
      it('should validate complete project config', () => {
        const validConfig: ProjectConfig = {
          projectId: TEST_CONFIG.TEST_PROJECT_ID,
          name: 'Test Project',
          lastSync: new Date().toISOString(),
          taskMappings: {}
        };

        const errors = ConfigManager.validateProjectConfig(validConfig);
        expect(errors).toHaveLength(0);
      });

      it('should return errors for missing fields', () => {
        const incompleteConfig = {
          // Missing projectId and name
        };

        const errors = ConfigManager.validateProjectConfig(incompleteConfig);
        expect(errors).toContain('Project ID is required');
        expect(errors).toContain('Project name is required');
      });
    });
  });

  describe('Cleanup', () => {
    describe('removeGlobalConfig', () => {
      it('should remove global configuration file', async () => {
        const testConfig: Config = {
          apiKey: TEST_CONFIG.TEST_API_KEY,
          apiSecret: TEST_CONFIG.TEST_API_SECRET,
          baseUrl: TEST_CONFIG.API_BASE_URL
        };

        await ConfigManager.setGlobalConfig(testConfig);
        expect(await ConfigManager.hasValidGlobalConfig()).toBe(true);

        await ConfigManager.removeGlobalConfig();
        expect(await ConfigManager.hasValidGlobalConfig()).toBe(false);

        // Cleanup
        const configDir = path.join(os.homedir(), '.config', '200notes');
        await fs.remove(configDir);
      });
    });

    describe('removeProjectConfig', () => {
      it('should remove project configuration file', async () => {
        await testHelpers.createMockConfig();
        expect(await ConfigManager.hasProjectConfig()).toBe(true);

        await ConfigManager.removeProjectConfig();
        expect(await ConfigManager.hasProjectConfig()).toBe(false);
      });
    });
  });
});