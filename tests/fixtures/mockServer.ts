import express from 'express';
import { Task, Project, ApiResponse } from '../../src/types';
import { testHelpers, TEST_CONFIG } from '../setup';

export class MockNotesServer {
  private app: express.Application;
  private server: any;
  private port: number;
  private projects: Map<string, Project> = new Map();
  private tasks: Map<number, Task> = new Map();
  private taskCounter = 1;

  constructor(port = 3001) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.seedData();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Auth middleware
    this.app.use('/api/v1/*', (req, res, next) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
      }

      const token = authHeader.substring(7);
      const [apiKey, apiSecret] = token.split(':');

      if (apiKey !== TEST_CONFIG.TEST_API_KEY || apiSecret !== TEST_CONFIG.TEST_API_SECRET) {
        return res.status(401).json({ error: 'Invalid API credentials' });
      }

      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Projects
    this.app.get('/api/v1/projects', (req, res) => {
      const projects = Array.from(this.projects.values());
      res.json(this.createApiResponse(projects));
    });

    this.app.post('/api/v1/projects', (req, res) => {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(422).json({
          error: 'Validation failed',
          messages: { name: ['Name is required'] }
        });
      }

      const project = testHelpers.createMockProject({
        id: `project-${Date.now()}`,
        name,
        description
      });

      this.projects.set(project.id, project);
      res.status(201).json(this.createApiResponse(project));
    });

    this.app.get('/api/v1/projects/:projectId', (req, res) => {
      const project = this.projects.get(req.params.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(this.createApiResponse(project));
    });

    this.app.put('/api/v1/projects/:projectId', (req, res) => {
      const project = this.projects.get(req.params.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      Object.assign(project, req.body, { updated_at: new Date().toISOString() });
      this.projects.set(project.id, project);
      res.json(this.createApiResponse(project));
    });

    this.app.delete('/api/v1/projects/:projectId', (req, res) => {
      const project = this.projects.get(req.params.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      this.projects.delete(req.params.projectId);
      
      // Delete associated tasks
      for (const [taskId, task] of this.tasks.entries()) {
        if (task.project.id === req.params.projectId) {
          this.tasks.delete(taskId);
        }
      }

      res.json({ message: 'Project deleted successfully' });
    });

    // Tasks
    this.app.get('/api/v1/projects/:projectId/tasks', (req, res) => {
      const projectId = req.params.projectId;
      const project = this.projects.get(projectId);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      let tasks = Array.from(this.tasks.values())
        .filter(task => task.project.id === projectId);

      // Apply filters
      const { status, priority, assignee_id, tags, due_before, overdue } = req.query;

      if (status) {
        tasks = tasks.filter(task => task.status === status);
      }

      if (priority) {
        tasks = tasks.filter(task => task.priority === priority);
      }

      if (assignee_id) {
        tasks = tasks.filter(task => task.assignee?.id === parseInt(assignee_id as string));
      }

      if (tags) {
        const tagList = (tags as string).split(',');
        tasks = tasks.filter(task => 
          tagList.some(tag => task.tags.includes(tag.trim()))
        );
      }

      if (due_before) {
        const dueDate = new Date(due_before as string);
        tasks = tasks.filter(task => 
          task.due_date && new Date(task.due_date) < dueDate
        );
      }

      if (overdue === 'true') {
        const now = new Date();
        tasks = tasks.filter(task => 
          task.due_date && 
          new Date(task.due_date) < now && 
          task.status !== 'done'
        );
      }

      res.json(this.createApiResponse(tasks));
    });

    this.app.post('/api/v1/projects/:projectId/tasks', (req, res) => {
      const projectId = req.params.projectId;
      const project = this.projects.get(projectId);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const { title, description, status = 'todo', priority = 'medium', tags = [], assignee_id, due_date } = req.body;

      if (!title) {
        return res.status(422).json({
          error: 'Validation failed',
          messages: { title: ['Title is required'] }
        });
      }

      const task = testHelpers.createMockTask({
        id: this.taskCounter++,
        title,
        description,
        status,
        priority,
        tags,
        assignee_id,
        due_date,
        project: {
          id: project.id,
          name: project.name
        }
      });

      this.tasks.set(task.id, task);
      res.status(201).json(this.createApiResponse(task));
    });

    this.app.get('/api/v1/tasks/:taskId', (req, res) => {
      const taskId = parseInt(req.params.taskId);
      const task = this.tasks.get(taskId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(this.createApiResponse(task));
    });

    this.app.put('/api/v1/tasks/:taskId', (req, res) => {
      const taskId = parseInt(req.params.taskId);
      const task = this.tasks.get(taskId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      Object.assign(task, req.body, { updated_at: new Date().toISOString() });
      this.tasks.set(taskId, task);
      res.json(this.createApiResponse(task));
    });

    this.app.patch('/api/v1/tasks/:taskId/status', (req, res) => {
      const taskId = parseInt(req.params.taskId);
      const task = this.tasks.get(taskId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const { status } = req.body;
      if (!['todo', 'in_progress', 'done'].includes(status)) {
        return res.status(422).json({
          error: 'Validation failed',
          messages: { status: ['Invalid status'] }
        });
      }

      task.status = status;
      task.updated_at = new Date().toISOString();
      this.tasks.set(taskId, task);
      
      res.json(this.createApiResponse(task));
    });

    this.app.delete('/api/v1/tasks/:taskId', (req, res) => {
      const taskId = parseInt(req.params.taskId);
      const task = this.tasks.get(taskId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      this.tasks.delete(taskId);
      res.json({ message: 'Task deleted successfully' });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Mock server error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  private seedData() {
    // Create a test project
    const testProject = testHelpers.createMockProject({
      id: TEST_CONFIG.TEST_PROJECT_ID,
      name: 'Demo Project',
      description: 'Test project for integration'
    });
    this.projects.set(testProject.id, testProject);

    // Create some test tasks
    const tasks = [
      testHelpers.createMockTask({
        id: 1,
        title: 'Implement Stripe webhook',
        description: 'Handle payment confirmations',
        status: 'todo',
        priority: 'high',
        tags: ['stripe', 'webhook', 'backend'],
        project: { id: testProject.id, name: testProject.name }
      }),
      testHelpers.createMockTask({
        id: 2,
        title: 'PDF generation service',
        description: 'Generate PDFs for download',
        status: 'in_progress',
        priority: 'medium',
        tags: ['pdf', 'service', 'backend'],
        project: { id: testProject.id, name: testProject.name }
      }),
      testHelpers.createMockTask({
        id: 3,
        title: 'Frontend loading states',
        description: 'Add loading indicators',
        status: 'todo',
        priority: 'low',
        tags: ['frontend', 'ui', 'ux'],
        project: { id: testProject.id, name: testProject.name }
      })
    ];

    tasks.forEach(task => this.tasks.set(task.id, task));
  }

  private createApiResponse<T>(data: T, message?: string): ApiResponse<T> {
    return { data, message };
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`Mock 200notes server running on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Mock server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  public getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  public getTask(id: number): Task | undefined {
    return this.tasks.get(id);
  }

  public getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  public getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  public clearData(): void {
    this.projects.clear();
    this.tasks.clear();
    this.taskCounter = 1;
    this.seedData();
  }
}