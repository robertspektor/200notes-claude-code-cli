// Test setup and global configuration

import * as fs from 'fs-extra';
import * as path from 'path';

// Global test configuration
export const TEST_CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  TEST_PROJECT_ID: 'test-project-123',
  TEST_API_KEY: 'test_key_12345',
  TEST_API_SECRET: 'test_secret_67890',
  TIMEOUT: 5000
};

// Mock console methods during tests to reduce noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests unless DEBUG=true
  if (process.env.DEBUG !== 'true') {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  if (process.env.DEBUG !== 'true') {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  }
});

// Clean up test artifacts before each test
beforeEach(async () => {
  // Remove any test configuration files
  const testFiles = [
    '.200notes.json',
    'CLAUDE.md',
    '.200notes-session.json'
  ];

  for (const file of testFiles) {
    if (await fs.pathExists(file)) {
      await fs.remove(file);
    }
  }
});

// Helper functions for tests
export const testHelpers = {
  /**
   * Create a temporary test directory
   */
  async createTempDir(): Promise<string> {
    const tempDir = path.join(__dirname, '../tmp', `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.ensureDir(tempDir);
    return tempDir;
  },

  /**
   * Clean up temporary directory
   */
  async cleanupTempDir(dirPath: string): Promise<void> {
    if (await fs.pathExists(dirPath)) {
      await fs.remove(dirPath);
    }
  },

  /**
   * Create mock configuration file
   */
  async createMockConfig(projectDir?: string): Promise<void> {
    const config = {
      projectId: TEST_CONFIG.TEST_PROJECT_ID,
      name: 'Test Project',
      lastSync: new Date().toISOString(),
      taskMappings: {},
      settings: {
        autoStartTasks: true,
        autoCompleteTasks: false,
        trackFileChanges: true
      }
    };

    const configPath = path.join(projectDir || process.cwd(), '.200notes.json');
    await fs.writeJson(configPath, config, { spaces: 2 });
  },

  /**
   * Create mock API response
   */
  createMockApiResponse<T>(data: T, message?: string) {
    return {
      data,
      message
    };
  },

  /**
   * Create mock task data
   */
  createMockTask(overrides = {}) {
    return {
      id: 1,
      title: 'Test Task',
      description: 'Test task description',
      status: 'todo' as const,
      priority: 'medium' as const,
      tags: ['test'],
      project: {
        id: TEST_CONFIG.TEST_PROJECT_ID,
        name: 'Test Project'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  },

  /**
   * Create mock project data
   */
  createMockProject(overrides = {}) {
    return {
      id: TEST_CONFIG.TEST_PROJECT_ID,
      name: 'Test Project',
      description: 'Test project description',
      owner_id: 1,
      is_favorite: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  },

  /**
   * Wait for a specified amount of time
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};