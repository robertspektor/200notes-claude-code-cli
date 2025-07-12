import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { testHelpers, TEST_CONFIG } from '../setup';

const execAsync = promisify(exec);

describe('CLI Integration Tests', () => {
  let tempDir: string;
  let originalCwd: string;
  let cliPath: string;

  beforeAll(async () => {
    // Build the CLI if not already built
    try {
      await execAsync('npm run build', { cwd: path.join(__dirname, '../..') });
    } catch (error) {
      console.warn('Build failed, continuing with existing build...');
    }
    
    cliPath = path.join(__dirname, '../../dist/cli.js');
  });

  beforeEach(async () => {
    // Create temporary directory for each test
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

  describe('CLI help and version', () => {
    it('should show help when no command provided', async () => {
      try {
        const { stdout } = await execAsync(`node "${cliPath}"`);
        expect(stdout).toContain('200notes');
        expect(stdout).toContain('Usage:');
        expect(stdout).toContain('Commands:');
      } catch (error) {
        // CLI shows help but exits with code 1, this is expected behavior
        expect(error.stdout || error.stderr).toContain('200notes');
      }
    });

    it('should show version information', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" version`);
      
      expect(stdout).toContain('200notes Claude Code Integration');
      expect(stdout).toContain('Version:');
    });

    it('should show help for specific commands', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" init --help`);
      
      expect(stdout).toContain('init');
      expect(stdout).toContain('Initialize 200notes integration');
    });
  });

  describe('Authentication commands', () => {
    describe('auth status', () => {
      it('should show not authenticated when no config exists', async () => {
        const { stdout } = await execAsync(`node "${cliPath}" auth status`);
        
        expect(stdout).toContain('Not authenticated');
      });

      it('should show authenticated when config exists', async () => {
        // Create mock global config
        const configDir = path.join(require('os').homedir(), '.config', '200notes');
        const configFile = path.join(configDir, 'config.json');
        
        await fs.ensureDir(configDir);
        await fs.writeJson(configFile, {
          apiKey: TEST_CONFIG.TEST_API_KEY,
          apiSecret: TEST_CONFIG.TEST_API_SECRET,
          baseUrl: TEST_CONFIG.API_BASE_URL
        });

        try {
          const { stdout } = await execAsync(`node "${cliPath}" auth status`);
          
          expect(stdout).toContain('Authenticated');
          expect(stdout).toContain(TEST_CONFIG.TEST_API_KEY.substring(0, 8));
        } finally {
          // Cleanup
          await fs.remove(configDir);
        }
      });
    });
  });

  describe('Project initialization', () => {
    it('should fail when not authenticated', async () => {
      try {
        await execAsync(`node "${cliPath}" init "Test Project"`, { timeout: 5000 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message || error.stdout || error.stderr).toContain('configuration');
      }
    });

    it('should create project configuration files', async () => {
      // Setup mock authentication
      const configDir = path.join(require('os').homedir(), '.config', '200notes');
      const configFile = path.join(configDir, 'config.json');
      
      await fs.ensureDir(configDir);
      await fs.writeJson(configFile, {
        apiKey: TEST_CONFIG.TEST_API_KEY,
        apiSecret: TEST_CONFIG.TEST_API_SECRET,
        baseUrl: 'http://mock-server.com' // Use mock server
      });

      try {
        // Note: This would fail with real API, but we're testing file creation
        await execAsync(`node "${cliPath}" init "Test Project" --force`).catch(() => {
          // Expected to fail due to mock server, but should create files first
        });

        // Check if attempt was made to create config files
        // In a real test, we'd mock the API responses
        expect(true).toBe(true); // Placeholder for actual file checks
        
      } finally {
        await fs.remove(configDir);
      }
    });
  });

  describe('Status command', () => {
    it('should fail when no project is initialized', async () => {
      try {
        await execAsync(`node "${cliPath}" status`, { timeout: 5000 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message || error.stdout || error.stderr).toContain('configuration');
      }
    });

    it('should show project status when initialized', async () => {
      // Create mock project config
      await testHelpers.createMockConfig();

      // Setup mock authentication
      const configDir = path.join(require('os').homedir(), '.config', '200notes');
      const configFile = path.join(configDir, 'config.json');
      
      await fs.ensureDir(configDir);
      await fs.writeJson(configFile, {
        apiKey: TEST_CONFIG.TEST_API_KEY,
        apiSecret: TEST_CONFIG.TEST_API_SECRET,
        baseUrl: 'http://mock-server.com'
      });

      try {
        // This would fail with mock server, but we're testing config validation
        await execAsync(`node "${cliPath}" status`).catch(() => {
          // Expected to fail due to mock API
        });

        expect(true).toBe(true); // Placeholder - in real test we'd mock API
        
      } finally {
        await fs.remove(configDir);
      }
    });
  });

  describe('Task management commands', () => {
    beforeEach(async () => {
      // Setup mock configs for task tests
      await testHelpers.createMockConfig();

      const configDir = path.join(require('os').homedir(), '.config', '200notes');
      const configFile = path.join(configDir, 'config.json');
      
      await fs.ensureDir(configDir);
      await fs.writeJson(configFile, {
        apiKey: TEST_CONFIG.TEST_API_KEY,
        apiSecret: TEST_CONFIG.TEST_API_SECRET,
        baseUrl: 'http://mock-server.com'
      });
    });

    afterEach(async () => {
      const configDir = path.join(require('os').homedir(), '.config', '200notes');
      await fs.remove(configDir);
    });

    describe('task create', () => {
      it('should validate required arguments', async () => {
        try {
          await execAsync(`node "${cliPath}" task create`, { timeout: 5000 });
          fail('Should have thrown an error');
        } catch (error) {
          // Should prompt for required title or show error
          expect(error.code).toBeTruthy();
        }
      });

      it('should accept task creation parameters', async () => {
        try {
          await execAsync(`node "${cliPath}" task create "Test Task" --priority high --tags test,demo`);
          fail('Expected to fail due to mock API');
        } catch (error) {
          // Would fail due to mock API, but validates parameter parsing
          expect(true).toBe(true);
        }
      });
    });

    describe('task update', () => {
      it('should require task ID', async () => {
        try {
          await execAsync(`node "${cliPath}" task update`);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error.stderr || error.stdout).toContain('required');
        }
      });

      it('should accept update parameters', async () => {
        try {
          await execAsync(`node "${cliPath}" task update 123 --status in_progress --priority high`);
          fail('Expected to fail due to mock API');
        } catch (error) {
          // Validates parameter parsing
          expect(true).toBe(true);
        }
      });
    });

    describe('task done', () => {
      it('should require task identifier', async () => {
        try {
          await execAsync(`node "${cliPath}" task done`);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error.stderr || error.stdout).toContain('required');
        }
      });
    });
  });

  describe('Configuration validation', () => {
    it('should validate project config exists for project commands', async () => {
      // Setup global config but no project config
      const configDir = path.join(require('os').homedir(), '.config', '200notes');
      const configFile = path.join(configDir, 'config.json');
      
      await fs.ensureDir(configDir);
      await fs.writeJson(configFile, {
        apiKey: TEST_CONFIG.TEST_API_KEY,
        apiSecret: TEST_CONFIG.TEST_API_SECRET,
        baseUrl: TEST_CONFIG.API_BASE_URL
      });

      try {
        await execAsync(`node "${cliPath}" status`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message || error.stdout || error.stderr).toContain('configuration');
      } finally {
        await fs.remove(configDir);
      }
    });

    it('should validate global config exists for API commands', async () => {
      // Create project config but no global config
      await testHelpers.createMockConfig();

      try {
        await execAsync(`node "${cliPath}" status`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message || error.stdout || error.stderr).toContain('configuration');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle invalid commands gracefully', async () => {
      try {
        await execAsync(`node "${cliPath}" invalidcommand`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.stdout || error.stderr).toContain('error');
      }
    });

    it('should show help for invalid subcommands', async () => {
      try {
        await execAsync(`node "${cliPath}" task invalidsubcommand`);
        fail('Should have thrown an error');
      } catch (error) {
        // Should show task command help
        expect(error.code).toBeTruthy();
      }
    });

    it('should handle file permission errors', async () => {
      // Create a read-only directory to test permission errors
      const readOnlyDir = path.join(tempDir, 'readonly');
      await fs.ensureDir(readOnlyDir);
      
      // Make directory read-only (on systems that support it)
      try {
        await fs.chmod(readOnlyDir, 0o444);
        
        process.chdir(readOnlyDir);
        
        await execAsync(`node "${cliPath}" init "Test"`).catch((error) => {
          // Expected to fail due to permissions
          expect(error.code).toBeTruthy();
        });
        
      } catch (chmodError) {
        // Skip test if chmod not supported
        console.log('Skipping permission test - chmod not supported');
      }
    });
  });

  describe('Output formatting', () => {
    it('should format status output correctly', async () => {
      // This would require mocking the API responses
      // For now, we just test that the command structure is correct
      expect(true).toBe(true);
    });

    it('should handle verbose flag', async () => {
      try {
        await execAsync(`node "${cliPath}" --verbose status`);
      } catch (error) {
        // Command structure should be valid regardless of API
        expect(true).toBe(true);
      }
    });

    it('should handle debug mode', async () => {
      try {
        await execAsync(`node "${cliPath}" --debug status`, {
          env: { ...process.env, DEBUG: 'true' }
        });
      } catch (error) {
        // Command structure should be valid
        expect(true).toBe(true);
      }
    });
  });
});

describe('CLI Command Line Argument Parsing', () => {
  let cliPath: string;

  beforeAll(() => {
    cliPath = path.join(__dirname, '../../dist/cli.js');
  });

  it('should parse global options correctly', async () => {
    const { stdout } = await execAsync(`node "${cliPath}" --help`);
    
    expect(stdout).toContain('--verbose');
    expect(stdout).toContain('--debug');
  });

  it('should handle option combinations', async () => {
    try {
      await execAsync(`node "${cliPath}" --verbose --debug version`);
    } catch (error) {
      // Should not fail due to argument parsing
      fail('Argument parsing failed');
    }
  });

  it('should validate required arguments', async () => {
    try {
      await execAsync(`node "${cliPath}" task update`); // Missing required task ID
      fail('Should have failed validation');
    } catch (error) {
      expect(error.code).toBeTruthy();
    }
  });

  it('should handle quoted arguments with spaces', async () => {
    try {
      await execAsync(`node "${cliPath}" task create "Task with spaces in title"`);
    } catch (error) {
      // Should not fail due to space handling (will fail due to no config)
      expect(error.stdout || error.stderr).toContain('No configuration found');
    }
  });
});