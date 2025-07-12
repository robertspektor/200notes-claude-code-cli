import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Task, Project, ApiResponse, ApiErrorResponse, Config } from '../types';

export class NotesApiClient {
  private client: AxiosInstance;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/v1`,
      headers: {
        'Authorization': `Bearer ${config.apiKey}:${config.apiSecret}`,
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      if (process.env.DEBUG === 'true') {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          throw new Error('Invalid API credentials. Please check your API key and secret.');
        }
        if (error.response?.status === 403) {
          throw new Error('Access denied. Please check your subscription status.');
        }
        throw error;
      }
    );
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    const response: AxiosResponse<ApiResponse<Project[]>> = await this.client.get('/projects');
    return response.data.data;
  }

  async getProject(projectId: string): Promise<Project> {
    const response: AxiosResponse<ApiResponse<Project>> = await this.client.get(`/projects/${projectId}`);
    return response.data.data;
  }

  async createProject(name: string, description?: string): Promise<Project> {
    const response: AxiosResponse<ApiResponse<Project>> = await this.client.post('/projects', {
      name,
      description,
    });
    return response.data.data;
  }

  async updateProject(projectId: string, updates: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project> {
    const response: AxiosResponse<ApiResponse<Project>> = await this.client.put(`/projects/${projectId}`, updates);
    return response.data.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.client.delete(`/projects/${projectId}`);
  }

  // Tasks
  async getTasks(projectId: string, filters?: {
    status?: string;
    priority?: string;
    assignee_id?: number;
    tags?: string[];
    due_before?: string;
    overdue?: boolean;
  }): Promise<Task[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }

    const url = `/projects/${projectId}/tasks${params.toString() ? `?${params.toString()}` : ''}`;
    const response: AxiosResponse<ApiResponse<Task[]>> = await this.client.get(url);
    return response.data.data;
  }

  async getTask(taskId: number): Promise<Task> {
    const response: AxiosResponse<ApiResponse<Task>> = await this.client.get(`/tasks/${taskId}`);
    return response.data.data;
  }

  async createTask(projectId: string, task: {
    title: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'done';
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
    assignee_id?: number;
    due_date?: string;
  }): Promise<Task> {
    const response: AxiosResponse<ApiResponse<Task>> = await this.client.post(`/projects/${projectId}/tasks`, task);
    return response.data.data;
  }

  async updateTask(taskId: number, updates: {
    title?: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'done';
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
    assignee_id?: number;
    due_date?: string;
  }): Promise<Task> {
    const response: AxiosResponse<ApiResponse<Task>> = await this.client.put(`/tasks/${taskId}`, updates);
    return response.data.data;
  }

  async updateTaskStatus(taskId: number, status: 'todo' | 'in_progress' | 'done'): Promise<Task> {
    const response: AxiosResponse<ApiResponse<Task>> = await this.client.patch(`/tasks/${taskId}/status`, { status });
    return response.data.data;
  }

  async deleteTask(taskId: number): Promise<void> {
    await this.client.delete(`/tasks/${taskId}`);
  }

  // Utility methods
  async testConnection(): Promise<boolean> {
    try {
      await this.getProjects();
      return true;
    } catch (error) {
      return false;
    }
  }

  async findTasksByKeywords(projectId: string, keywords: string[]): Promise<Task[]> {
    const allTasks = await this.getTasks(projectId);
    
    return allTasks.filter(task => {
      const searchText = `${task.title} ${task.description || ''} ${task.tags.join(' ')}`.toLowerCase();
      return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
    });
  }

  async findTasksByFiles(projectId: string, filePaths: string[]): Promise<Task[]> {
    // This would require additional metadata in tasks or a separate mapping
    // For now, we'll use filename-based keyword matching
    const keywords = filePaths.map(path => {
      const filename = path.split('/').pop() || '';
      return filename.replace(/\.[^/.]+$/, ''); // remove extension
    });

    return this.findTasksByKeywords(projectId, keywords);
  }
}