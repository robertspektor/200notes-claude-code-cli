import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { MockNotesServer } from '../fixtures/mockServer';
import { testHelpers, TEST_CONFIG } from '../setup';

const execAsync = promisify(exec);

describe('End-to-End Full Workflow Tests', () => {
  let tempDir: string;
  let originalCwd: string;
  let cliPath: string;
  let mockServer: MockNotesServer;

  beforeAll(async () => {
    // Start mock server
    mockServer = new MockNotesServer(3001);
    await mockServer.start();
    
    // Build CLI
    cliPath = path.join(__dirname, '../../dist/cli.js');
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await testHelpers.createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Clear server data
    mockServer.clearData();

    // Setup global config
    const configDir = path.join(require('os').homedir(), '.config', '200notes');
    const configFile = path.join(configDir, 'config.json');
    
    await fs.ensureDir(configDir);
    await fs.writeJson(configFile, {
      apiKey: TEST_CONFIG.TEST_API_KEY,
      apiSecret: TEST_CONFIG.TEST_API_SECRET,
      baseUrl: mockServer.getUrl()
    });
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up temp directory
    await testHelpers.cleanupTempDir(tempDir);

    // Clean up global config
    const configDir = path.join(require('os').homedir(), '.config', '200notes');
    if (await fs.pathExists(configDir)) {
      await fs.remove(configDir);
    }
  });

  describe('Complete Development Workflow', () => {
    it('should handle full project lifecycle from init to completion', async () => {
      // Step 1: Verify authentication
      const { stdout: authStatus } = await execAsync(`node "${cliPath}" auth status`);
      expect(authStatus).toContain('Authenticated');

      // Step 2: Initialize project
      const projectName = 'E2E Test Project';
      try {
        await execAsync(`node "${cliPath}" init "${projectName}" --force`);
      } catch (error) {
        // Command might prompt for input, handle gracefully
        console.log('Init completed with prompts');
      }

      // Verify project files were created
      expect(await fs.pathExists('.200notes.json')).toBe(true);
      expect(await fs.pathExists('CLAUDE.md')).toBe(true);

      // Verify project config
      const projectConfig = await fs.readJson('.200notes.json');
      expect(projectConfig.name).toBe(projectName);
      expect(projectConfig.projectId).toBeTruthy();

      // Step 3: Create tasks for different project areas
      const tasks = [
        { title: 'Setup Stripe integration', priority: 'high', tags: 'backend,stripe' },
        { title: 'Implement PDF generation', priority: 'medium', tags: 'backend,pdf' },
        { title: 'Add loading states', priority: 'low', tags: 'frontend,ui' },
        { title: 'Write unit tests', priority: 'high', tags: 'testing' }
      ];

      for (const task of tasks) {
        await execAsync(`node "${cliPath}" task create "${task.title}" --priority ${task.priority} --tags ${task.tags}`);
      }

      // Step 4: Verify tasks were created
      const { stdout: statusOutput } = await execAsync(`node "${cliPath}" status`);
      expect(statusOutput).toContain('Total: 4');
      expect(statusOutput).toContain('Todo: 4');

      // Step 5: Start working on tasks (simulate development workflow)
      await execAsync(`node "${cliPath}" task start "Setup Stripe integration"`);
      await execAsync(`node "${cliPath}" task start "Write unit tests"`);

      // Verify status updates
      const { stdout: updatedStatus } = await execAsync(`node "${cliPath}" status`);
      expect(updatedStatus).toContain('In Progress: 2');
      expect(updatedStatus).toContain('Todo: 2');

      // Step 6: Complete some tasks
      await execAsync(`node "${cliPath}" task done "Setup Stripe integration"`);
      await execAsync(`node "${cliPath}" task done "Write unit tests"`);

      // Step 7: Verify final status
      const { stdout: finalStatus } = await execAsync(`node "${cliPath}" status`);
      expect(finalStatus).toContain('Completed: 2');
      expect(finalStatus).toContain('Todo: 2');
      expect(finalStatus).toContain('Progress: 50%');

      // Step 8: Verify CLAUDE.md was updated
      const claudeMdContent = await fs.readFile('CLAUDE.md', 'utf8');
      expect(claudeMdContent).toContain(projectName);
      expect(claudeMdContent).toContain('Task Summary');
      expect(claudeMdContent).toContain('50%');

      // Step 9: Sync with server
      await execAsync(`node "${cliPath}" sync`);

      // Verify server has correct data
      const serverTasks = mockServer.getAllTasks();
      expect(serverTasks).toHaveLength(4);
      
      const completedTasks = serverTasks.filter(t => t.status === 'done');
      expect(completedTasks).toHaveLength(2);
    });
  });

  describe('File-to-Task Mapping Workflow', () => {
    it('should demonstrate intelligent task mapping based on file changes', async () => {
      // Setup project
      await execAsync(`node "${cliPath}" init "File Mapping Test" --force`).catch(() => {});

      // Create project structure
      await fs.ensureDir('src/controllers');
      await fs.ensureDir('src/services');
      await fs.ensureDir('tests');

      // Create tasks for different components
      await execAsync(`node "${cliPath}" task create "Payment controller implementation" --tags payment,controller,backend`);
      await execAsync(`node "${cliPath}" task create "Stripe service integration" --tags stripe,service,backend`);
      await execAsync(`node "${cliPath}" task create "PDF generator service" --tags pdf,service,backend`);
      await execAsync(`node "${cliPath}" task create "Controller unit tests" --tags testing,controller`);

      // Simulate file changes that should map to tasks
      const files = [
        { path: 'src/controllers/PaymentController.js', content: '// Payment processing logic' },
        { path: 'src/services/StripeService.js', content: '// Stripe integration' },
        { path: 'src/services/PdfService.js', content: '// PDF generation' },
        { path: 'tests/PaymentController.test.js', content: '// Payment controller tests' }
      ];

      for (const file of files) {
        await fs.ensureFile(file.path);
        await fs.writeFile(file.path, file.content);
      }

      // In a real scenario, the hooks would automatically detect these changes
      // For testing, we manually update the relevant tasks
      
      // Simulate automatic task updates that would happen via hooks
      await execAsync(`node "${cliPath}" task start "Payment controller implementation"`);
      await execAsync(`node "${cliPath}" task start "Stripe service integration"`);

      // Verify the workflow
      const { stdout: status } = await execAsync(`node "${cliPath}" status`);
      expect(status).toContain('In Progress: 2');

      // Complete tasks as development progresses
      await execAsync(`node "${cliPath}" task done "Payment controller implementation"`);
      
      const { stdout: finalStatus } = await execAsync(`node "${cliPath}" status`);
      expect(finalStatus).toContain('Completed: 1');
      expect(finalStatus).toContain('In Progress: 1');
    });
  });

  describe('Team Collaboration Workflow', () => {
    it('should handle multi-developer collaboration scenarios', async () => {
      // Setup project
      await execAsync(`node "${cliPath}" init "Team Project" --force`).catch(() => {});

      // Create tasks with different priorities and assignments
      const teamTasks = [
        { title: 'Backend API development', priority: 'high', assignee: 'john@team.com' },
        { title: 'Frontend components', priority: 'medium', assignee: 'sarah@team.com' },
        { title: 'Database migrations', priority: 'high', assignee: 'mike@team.com' },
        { title: 'Integration testing', priority: 'low', assignee: 'lisa@team.com' }
      ];

      for (const task of teamTasks) {
        await execAsync(`node "${cliPath}" task create "${task.title}" --priority ${task.priority}`);
      }

      // Simulate different team members working on tasks
      await execAsync(`node "${cliPath}" task start "Backend API development"`);
      await execAsync(`node "${cliPath}" task start "Database migrations"`);

      // Update task details (simulate team collaboration)
      await execAsync(`node "${cliPath}" task update 1 --description "Implementing REST endpoints for user management"`);
      await execAsync(`node "${cliPath}" task update 3 --tags backend,database,migration`);

      // Complete tasks at different times (simulate async work)
      await execAsync(`node "${cliPath}" task done "Backend API development"`);
      
      await testHelpers.wait(100); // Small delay to simulate time passage
      
      await execAsync(`node "${cliPath}" task start "Frontend components"`);
      await execAsync(`node "${cliPath}" task done "Database migrations"`);

      // Verify team progress
      const { stdout: teamStatus } = await execAsync(`node "${cliPath}" status`);
      expect(teamStatus).toContain('Completed: 2');
      expect(teamStatus).toContain('In Progress: 1');
      expect(teamStatus).toContain('Todo: 1');

      // Check CLAUDE.md reflects team activity
      const claudeContent = await fs.readFile('CLAUDE.md', 'utf8');
      expect(claudeContent).toContain('Recently Completed');
      expect(claudeContent).toContain('In Progress');

      // Verify server state
      const serverTasks = mockServer.getAllTasks();
      const completedCount = serverTasks.filter(t => t.status === 'done').length;
      const inProgressCount = serverTasks.filter(t => t.status === 'in_progress').length;
      
      expect(completedCount).toBe(2);
      expect(inProgressCount).toBe(1);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle network failures gracefully', async () => {
      // Setup project first
      await execAsync(`node "${cliPath}" init "Network Test" --force`).catch(() => {});

      // Stop mock server to simulate network failure
      await mockServer.stop();

      // Commands should fail gracefully
      try {
        await execAsync(`node "${cliPath}" task create "Test task"`, { timeout: 3000 });
        fail('Should have failed due to network error');
      } catch (error) {
        expect(error.message).toContain('timeout');
      }

      try {
        await execAsync(`node "${cliPath}" status`, { timeout: 3000 });
        fail('Should have failed due to network error');
      } catch (error) {
        expect(error.message).toContain('timeout');
      }

      // Restart server
      mockServer = new MockNotesServer(3001);
      await mockServer.start();

      // Commands should work again
      await execAsync(`node "${cliPath}" auth status`);
      // Note: Project would need re-initialization as server data was reset
    });

    it('should handle concurrent task updates', async () => {
      // Setup project
      await execAsync(`node "${cliPath}" init "Concurrency Test" --force`).catch(() => {});

      // Create a task
      await execAsync(`node "${cliPath}" task create "Concurrent task" --priority medium`);

      // Simulate concurrent updates (would be more realistic with actual concurrent processes)
      const updates = [
        execAsync(`node "${cliPath}" task update 1 --priority high`),
        execAsync(`node "${cliPath}" task update 1 --description "Updated description"`),
        execAsync(`node "${cliPath}" task update 1 --tags testing,concurrent`)
      ];

      // Wait for all updates to complete
      await Promise.allSettled(updates);

      // Verify final state is consistent
      const serverTask = mockServer.getTask(1);
      expect(serverTask).toBeTruthy();
      expect(serverTask?.priority).toBe('high'); // Last update should win
    });

    it('should maintain data consistency across sessions', async () => {
      // Session 1: Setup and initial work
      await execAsync(`node "${cliPath}" init "Persistence Test" --force`).catch(() => {});
      await execAsync(`node "${cliPath}" task create "Persistent task" --priority high`);
      await execAsync(`node "${cliPath}" task start "Persistent task"`);

      // Record initial state
      const initialConfig = await fs.readJson('.200notes.json');
      const { stdout: initialStatus } = await execAsync(`node "${cliPath}" status`);

      // Simulate session end/restart by changing directory and coming back
      const projectDir = process.cwd();
      process.chdir(originalCwd);
      await testHelpers.wait(100);
      process.chdir(projectDir);

      // Session 2: Resume work
      const resumedConfig = await fs.readJson('.200notes.json');
      expect(resumedConfig.projectId).toBe(initialConfig.projectId);

      const { stdout: resumedStatus } = await execAsync(`node "${cliPath}" status`);
      expect(resumedStatus).toContain('In Progress: 1');

      // Complete the task
      await execAsync(`node "${cliPath}" task done "Persistent task"`);

      // Verify persistence
      const { stdout: finalStatus } = await execAsync(`node "${cliPath}" status`);
      expect(finalStatus).toContain('Completed: 1');
      expect(finalStatus).toContain('Progress: 100%');
    });
  });
});

describe('Performance and Scale Tests', () => {
  let tempDir: string;
  let originalCwd: string;
  let cliPath: string;
  let mockServer: MockNotesServer;

  beforeAll(async () => {
    mockServer = new MockNotesServer(3002);
    await mockServer.start();
    cliPath = path.join(__dirname, '../../dist/cli.js');
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  beforeEach(async () => {
    tempDir = await testHelpers.createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Setup config
    const configDir = path.join(require('os').homedir(), '.config', '200notes');
    await fs.ensureDir(configDir);
    await fs.writeJson(path.join(configDir, 'config.json'), {
      apiKey: TEST_CONFIG.TEST_API_KEY,
      apiSecret: TEST_CONFIG.TEST_API_SECRET,
      baseUrl: mockServer.getUrl()
    });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await testHelpers.cleanupTempDir(tempDir);
    
    const configDir = path.join(require('os').homedir(), '.config', '200notes');
    if (await fs.pathExists(configDir)) {
      await fs.remove(configDir);
    }
  });

  it('should handle large numbers of tasks efficiently', async () => {
    await execAsync(`node "${cliPath}" init "Scale Test" --force`).catch(() => {});

    const taskCount = 50;
    const startTime = Date.now();

    // Create many tasks
    const createPromises = [];
    for (let i = 1; i <= taskCount; i++) {
      createPromises.push(
        execAsync(`node "${cliPath}" task create "Task ${i}" --priority medium --tags test,scale`)
      );
    }

    await Promise.all(createPromises);
    const createTime = Date.now() - startTime;

    // Verify all tasks were created
    const { stdout: status } = await execAsync(`node "${cliPath}" status`);
    expect(status).toContain(`Total: ${taskCount}`);

    // Performance check: should handle 50 tasks in reasonable time
    expect(createTime).toBeLessThan(30000); // 30 seconds max

    console.log(`Created ${taskCount} tasks in ${createTime}ms`);
  });

  it('should maintain responsiveness with complex project structures', async () => {
    await execAsync(`node "${cliPath}" init "Complex Structure Test" --force`).catch(() => {});

    // Create complex directory structure
    const dirs = [
      'src/controllers', 'src/services', 'src/models', 'src/middleware',
      'tests/unit', 'tests/integration', 'tests/e2e',
      'docs/api', 'docs/guides',
      'config/env', 'scripts/deployment'
    ];

    for (const dir of dirs) {
      await fs.ensureDir(dir);
      // Add some files
      await fs.writeFile(path.join(dir, 'index.js'), '// Placeholder');
      await fs.writeFile(path.join(dir, 'README.md'), '# Directory');
    }

    // Create tasks for each area
    const areas = ['controllers', 'services', 'models', 'middleware', 'testing', 'documentation', 'deployment'];
    for (const area of areas) {
      await execAsync(`node "${cliPath}" task create "Implement ${area}" --tags ${area},development`);
    }

    // Measure status command performance
    const statusStart = Date.now();
    await execAsync(`node "${cliPath}" status`);
    const statusTime = Date.now() - statusStart;

    // Should remain responsive
    expect(statusTime).toBeLessThan(2000); // 2 seconds max

    console.log(`Status command completed in ${statusTime}ms with complex structure`);
  });
});