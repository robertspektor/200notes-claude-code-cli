import * as fs from 'fs-extra';
import * as path from 'path';
import { Task, Project, ClaudeCodeSession } from '../types';

export class ClaudeMdManager {
  private static readonly CLAUDE_MD_FILE = 'CLAUDE.md';

  /**
   * Create or update CLAUDE.md with current project state
   */
  static async updateClaudeMd(
    project: Project,
    tasks: Task[],
    session?: ClaudeCodeSession
  ): Promise<void> {
    const content = ClaudeMdManager.generateClaudeMdContent(project, tasks, session);
    await fs.writeFile(ClaudeMdManager.CLAUDE_MD_FILE, content, 'utf8');
  }

  /**
   * Generate CLAUDE.md content
   */
  static generateClaudeMdContent(
    project: Project,
    tasks: Task[],
    session?: ClaudeCodeSession
  ): string {
    const sections: string[] = [];

    // Header
    sections.push(`# ${project.name}`);
    sections.push('');

    // Project info
    sections.push('## 🏗️ Project Information');
    sections.push(`- **Project ID**: \`${project.id}\``);
    sections.push(`- **Description**: ${project.description || 'No description provided'}`);
    sections.push(`- **Last Updated**: ${new Date().toISOString()}`);
    sections.push('');

    // Task summary
    const tasksByStatus = ClaudeMdManager.groupTasksByStatus(tasks);
    const totalTasks = tasks.length;
    const completedTasks = tasksByStatus.done?.length || 0;
    const inProgressTasks = tasksByStatus.in_progress?.length || 0;
    const todoTasks = tasksByStatus.todo?.length || 0;

    sections.push('## 📊 Task Summary');
    sections.push(`- **Total Tasks**: ${totalTasks}`);
    sections.push(`- ✅ **Completed**: ${completedTasks}`);
    sections.push(`- 🚧 **In Progress**: ${inProgressTasks}`);
    sections.push(`- ⏳ **Todo**: ${todoTasks}`);
    
    if (totalTasks > 0) {
      const completionRate = Math.round((completedTasks / totalTasks) * 100);
      sections.push(`- 📈 **Progress**: ${completionRate}%`);
    }
    sections.push('');

    // Current tasks (active ones)
    if (inProgressTasks > 0 || todoTasks > 0) {
      sections.push('## 🎯 Current Tasks');
      sections.push('');

      // In Progress tasks
      if (tasksByStatus.in_progress && tasksByStatus.in_progress.length > 0) {
        sections.push('### 🚧 In Progress');
        tasksByStatus.in_progress.forEach(task => {
          sections.push(ClaudeMdManager.formatTaskForMd(task));
        });
        sections.push('');
      }

      // Todo tasks (limit to top 10 by priority)
      if (tasksByStatus.todo && tasksByStatus.todo.length > 0) {
        sections.push('### ⏳ Next Up');
        const topTodoTasks = ClaudeMdManager.sortTasksByPriority(tasksByStatus.todo).slice(0, 10);
        topTodoTasks.forEach(task => {
          sections.push(ClaudeMdManager.formatTaskForMd(task));
        });
        
        if (tasksByStatus.todo.length > 10) {
          sections.push(`*... and ${tasksByStatus.todo.length - 10} more tasks*`);
        }
        sections.push('');
      }
    }

    // Recently completed tasks
    if (tasksByStatus.done && tasksByStatus.done.length > 0) {
      sections.push('## ✅ Recently Completed');
      const recentlyCompleted = tasksByStatus.done
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);
      
      recentlyCompleted.forEach(task => {
        sections.push(ClaudeMdManager.formatTaskForMd(task, true));
      });
      sections.push('');
    }

    // Session information
    if (session) {
      sections.push('## 💻 Current Session');
      sections.push(`- **Started**: ${new Date(session.startTime).toLocaleString()}`);
      
      if (session.tasksModified.length > 0) {
        sections.push(`- **Tasks Modified**: ${session.tasksModified.length}`);
      }
      
      if (session.tasksCreated.length > 0) {
        sections.push(`- **Tasks Created**: ${session.tasksCreated.length}`);
      }
      
      if (session.filesChanged.length > 0) {
        sections.push(`- **Files Changed**: ${session.filesChanged.length}`);
        session.filesChanged.slice(0, 5).forEach(file => {
          sections.push(`  - \`${file}\``);
        });
        
        if (session.filesChanged.length > 5) {
          sections.push(`  - *... and ${session.filesChanged.length - 5} more files*`);
        }
      }
      sections.push('');
    }

    // Quick actions
    sections.push('## 🚀 Quick Actions');
    sections.push('```bash');
    sections.push('# View all tasks');
    sections.push('200notes status');
    sections.push('');
    sections.push('# Create a new task');
    sections.push('200notes task create "Task title"');
    sections.push('');
    sections.push('# Mark task as done');
    sections.push('200notes task done <task-id>');
    sections.push('');
    sections.push('# Start working on a task');
    sections.push('200notes task start <task-id>');
    sections.push('```');
    sections.push('');

    // Task context for Claude
    sections.push('## 🤖 Context for Claude Code');
    sections.push('');
    sections.push('When working on this project, consider the following tasks and their relationships:');
    sections.push('');

    // Group tasks by tags/categories
    const tasksByTag = ClaudeMdManager.groupTasksByTags(tasks.filter(t => t.status !== 'done'));
    Object.entries(tasksByTag).forEach(([tag, tagTasks]) => {
      if (tagTasks.length > 0) {
        sections.push(`### #${tag}`);
        tagTasks.slice(0, 5).forEach(task => {
          sections.push(`- **${task.title}** (${task.status}) - ${task.description || 'No description'}`);
        });
        sections.push('');
      }
    });

    // Footer
    sections.push('---');
    sections.push('*This file is automatically generated by 200notes Claude Code integration.*');
    sections.push(`*Last updated: ${new Date().toISOString()}*`);

    return sections.join('\n');
  }

  /**
   * Read and parse existing CLAUDE.md file
   */
  static async readClaudeMd(): Promise<string | null> {
    try {
      if (await fs.pathExists(ClaudeMdManager.CLAUDE_MD_FILE)) {
        return await fs.readFile(ClaudeMdManager.CLAUDE_MD_FILE, 'utf8');
      }
      return null;
    } catch (error) {
      console.error('Error reading CLAUDE.md:', error);
      return null;
    }
  }

  /**
   * Backup current CLAUDE.md file
   */
  static async backupClaudeMd(): Promise<void> {
    const backupFile = `CLAUDE.md.backup.${Date.now()}`;
    
    try {
      if (await fs.pathExists(ClaudeMdManager.CLAUDE_MD_FILE)) {
        await fs.copy(ClaudeMdManager.CLAUDE_MD_FILE, backupFile);
      }
    } catch (error) {
      console.error('Error backing up CLAUDE.md:', error);
    }
  }

  /**
   * Group tasks by status
   */
  private static groupTasksByStatus(tasks: Task[]): Record<string, Task[]> {
    return tasks.reduce((groups, task) => {
      const status = task.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(task);
      return groups;
    }, {} as Record<string, Task[]>);
  }

  /**
   * Group tasks by tags
   */
  private static groupTasksByTags(tasks: Task[]): Record<string, Task[]> {
    const tagGroups: Record<string, Task[]> = {};
    
    tasks.forEach(task => {
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tag => {
          if (!tagGroups[tag]) {
            tagGroups[tag] = [];
          }
          tagGroups[tag].push(task);
        });
      } else {
        // Tasks without tags go to 'general'
        if (!tagGroups.general) {
          tagGroups.general = [];
        }
        tagGroups.general.push(task);
      }
    });
    
    return tagGroups;
  }

  /**
   * Sort tasks by priority
   */
  private static sortTasksByPriority(tasks: Task[]): Task[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return tasks.sort((a, b) => {
      const priorityA = priorityOrder[a.priority] || 0;
      const priorityB = priorityOrder[b.priority] || 0;
      return priorityB - priorityA;
    });
  }

  /**
   * Format a task for markdown display
   */
  private static formatTaskForMd(task: Task, showUpdatedTime = false): string {
    const priorityEmoji = ClaudeMdManager.getPriorityEmoji(task.priority);
    const statusEmoji = ClaudeMdManager.getStatusEmoji(task.status);
    
    let line = `- ${statusEmoji} ${priorityEmoji} **${task.title}** (#${task.id})`;
    
    if (task.description) {
      line += ` - ${task.description}`;
    }
    
    const details: string[] = [];
    
    if (task.tags && task.tags.length > 0) {
      details.push(`Tags: ${task.tags.map(tag => `#${tag}`).join(', ')}`);
    }
    
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const isOverdue = dueDate < new Date() && task.status !== 'done';
      details.push(`Due: ${dueDate.toLocaleDateString()}${isOverdue ? ' ⚠️' : ''}`);
    }
    
    if (task.assignee) {
      details.push(`Assignee: @${task.assignee.name}`);
    }
    
    if (showUpdatedTime) {
      const updatedDate = new Date(task.updated_at);
      details.push(`Completed: ${updatedDate.toLocaleDateString()}`);
    }
    
    if (details.length > 0) {
      line += ` *(${details.join(', ')})*`;
    }
    
    return line;
  }

  /**
   * Get emoji for task priority
   */
  private static getPriorityEmoji(priority: string): string {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  /**
   * Get emoji for task status
   */
  private static getStatusEmoji(status: string): string {
    switch (status) {
      case 'todo': return '⏳';
      case 'in_progress': return '🚧';
      case 'done': return '✅';
      default: return '📝';
    }
  }
}