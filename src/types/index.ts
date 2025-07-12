export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  due_date?: string;
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  project: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  messages?: Record<string, string[]>;
}

export interface Config {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  projectId?: string;
}

export interface ProjectConfig {
  projectId: string;
  name: string;
  lastSync?: string;
  taskMappings?: Record<string, number[]>; // file path -> task IDs
}

export interface TaskMapping {
  taskId: number;
  files: string[];
  patterns: string[];
  keywords: string[];
}

export interface HookContext {
  toolType: string;
  filePath?: string;
  content?: string;
  changes?: string[];
}

export interface ClaudeCodeSession {
  startTime: string;
  endTime?: string;
  tasksModified: number[];
  tasksCreated: number[];
  filesChanged: string[];
  summary?: string;
}