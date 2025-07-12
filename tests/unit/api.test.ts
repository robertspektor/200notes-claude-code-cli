import axios from 'axios';
import { NotesApiClient } from '../../src/lib/api';
import { Config } from '../../src/types';
import { testHelpers, TEST_CONFIG } from '../setup';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NotesApiClient', () => {
  let apiClient: NotesApiClient;
  let mockConfig: Config;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup test configuration
    mockConfig = {
      apiKey: TEST_CONFIG.TEST_API_KEY,
      apiSecret: TEST_CONFIG.TEST_API_SECRET,
      baseUrl: TEST_CONFIG.API_BASE_URL
    };

    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    // Create API client
    apiClient = new NotesApiClient(mockConfig);
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: `${mockConfig.baseUrl}/api/v1`,
        headers: {
          'Authorization': `Bearer ${mockConfig.apiKey}:${mockConfig.apiSecret}`,
          'Content-Type': 'application/json'
        }
      });
    });

    it('should setup request and response interceptors', () => {
      const mockInstance = mockedAxios.create.mock.results[0].value;
      expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('getProjects', () => {
    it('should fetch and return projects', async () => {
      const mockProjects = [
        testHelpers.createMockProject({ id: '1', name: 'Project 1' }),
        testHelpers.createMockProject({ id: '2', name: 'Project 2' })
      ];

      const mockResponse = testHelpers.createMockApiResponse(mockProjects);
      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.getProjects();

      expect(mockInstance.get).toHaveBeenCalledWith('/projects');
      expect(result).toEqual(mockProjects);
    });

    it('should handle API errors', async () => {
      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.get.mockRejectedValue(new Error('API Error'));

      await expect(apiClient.getProjects()).rejects.toThrow('API Error');
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const projectData = { name: 'New Project', description: 'Test project' };
      const mockProject = testHelpers.createMockProject(projectData);
      const mockResponse = testHelpers.createMockApiResponse(mockProject);

      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.createProject(projectData.name, projectData.description);

      expect(mockInstance.post).toHaveBeenCalledWith('/projects', projectData);
      expect(result).toEqual(mockProject);
    });
  });

  describe('getTasks', () => {
    it('should fetch tasks for a project', async () => {
      const projectId = TEST_CONFIG.TEST_PROJECT_ID;
      const mockTasks = [
        testHelpers.createMockTask({ id: 1, title: 'Task 1' }),
        testHelpers.createMockTask({ id: 2, title: 'Task 2' })
      ];

      const mockResponse = testHelpers.createMockApiResponse(mockTasks);
      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.getTasks(projectId);

      expect(mockInstance.get).toHaveBeenCalledWith(`/projects/${projectId}/tasks`);
      expect(result).toEqual(mockTasks);
    });

    it('should apply filters when provided', async () => {
      const projectId = TEST_CONFIG.TEST_PROJECT_ID;
      const filters = {
        status: 'todo',
        priority: 'high',
        tags: ['urgent', 'bug']
      };

      const mockTasks = [testHelpers.createMockTask()];
      const mockResponse = testHelpers.createMockApiResponse(mockTasks);
      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.get.mockResolvedValue({ data: mockResponse });

      await apiClient.getTasks(projectId, filters);

      const expectedUrl = `/projects/${projectId}/tasks?status=todo&priority=high&tags=urgent%2Cbug`;
      expect(mockInstance.get).toHaveBeenCalledWith(expectedUrl);
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const projectId = TEST_CONFIG.TEST_PROJECT_ID;
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        priority: 'high' as const,
        tags: ['urgent']
      };

      const mockTask = testHelpers.createMockTask(taskData);
      const mockResponse = testHelpers.createMockApiResponse(mockTask);
      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.createTask(projectId, taskData);

      expect(mockInstance.post).toHaveBeenCalledWith(`/projects/${projectId}/tasks`, taskData);
      expect(result).toEqual(mockTask);
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', async () => {
      const taskId = 1;
      const updates = { status: 'in_progress' as const, priority: 'high' as const };

      const mockTask = testHelpers.createMockTask({ id: taskId, ...updates });
      const mockResponse = testHelpers.createMockApiResponse(mockTask);
      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.put.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.updateTask(taskId, updates);

      expect(mockInstance.put).toHaveBeenCalledWith(`/tasks/${taskId}`, updates);
      expect(result).toEqual(mockTask);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', async () => {
      const taskId = 1;
      const newStatus = 'done' as const;

      const mockTask = testHelpers.createMockTask({ id: taskId, status: newStatus });
      const mockResponse = testHelpers.createMockApiResponse(mockTask);
      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.patch.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.updateTaskStatus(taskId, newStatus);

      expect(mockInstance.patch).toHaveBeenCalledWith(`/tasks/${taskId}/status`, { status: newStatus });
      expect(result).toEqual(mockTask);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const taskId = 1;
      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.delete.mockResolvedValue({});

      await apiClient.deleteTask(taskId);

      expect(mockInstance.delete).toHaveBeenCalledWith(`/tasks/${taskId}`);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      const mockProjects = [testHelpers.createMockProject()];
      const mockResponse = testHelpers.createMockApiResponse(mockProjects);
      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.testConnection();

      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.get.mockRejectedValue(new Error('Connection failed'));

      const result = await apiClient.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('findTasksByKeywords', () => {
    it('should find tasks matching keywords', async () => {
      const projectId = TEST_CONFIG.TEST_PROJECT_ID;
      const keywords = ['stripe', 'payment'];

      const mockTasks = [
        testHelpers.createMockTask({ title: 'Stripe integration', tags: ['payment'] }),
        testHelpers.createMockTask({ title: 'User profile', tags: ['user'] }),
        testHelpers.createMockTask({ title: 'Payment gateway', description: 'Stripe setup' })
      ];

      const mockResponse = testHelpers.createMockApiResponse(mockTasks);
      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.findTasksByKeywords(projectId, keywords);

      // Should return 2 tasks that match keywords
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Stripe integration');
      expect(result[1].title).toBe('Payment gateway');
    });
  });

  describe('findTasksByFiles', () => {
    it('should find tasks based on file paths', async () => {
      const projectId = TEST_CONFIG.TEST_PROJECT_ID;
      const filePaths = ['src/PaymentController.js', 'src/StripeService.js'];

      const mockTasks = [
        testHelpers.createMockTask({ title: 'Payment processing', tags: ['payment'] }),
        testHelpers.createMockTask({ title: 'Stripe webhook', tags: ['stripe'] }),
        testHelpers.createMockTask({ title: 'User authentication', tags: ['auth'] })
      ];

      const mockResponse = testHelpers.createMockApiResponse(mockTasks);
      const mockInstance = mockedAxios.create.mock.results[0].value;
      mockInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.findTasksByFiles(projectId, filePaths);

      // Should return tasks matching file-based keywords (PaymentController -> Payment, StripeService -> Stripe)
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });
});