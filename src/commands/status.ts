import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config';
import { NotesApiClient } from '../lib/api';
import { Task } from '../types';

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Show current project status and tasks')
    .option('-a, --all', 'Show all tasks (including completed)')
    .option('-f, --filter <status>', 'Filter by status (todo, in_progress, done)')
    .option('-p, --priority <priority>', 'Filter by priority (low, medium, high)')
    .action(async (options) => {
      try {
        await showStatus(options);
      } catch (error) {
        console.error(chalk.red('Error getting status:'), error.message);
        process.exit(1);
      }
    });
}

async function showStatus(options: {
  all?: boolean;
  filter?: string;
  priority?: string;
}): Promise<void> {
  const config = await ConfigManager.getApiConfig();
  if (!config) {
    console.error(chalk.red('No configuration found. Run "200notes init" first.'));
    return;
  }

  const projectConfig = await ConfigManager.getProjectConfig();
  if (!projectConfig) {
    console.error(chalk.red('No project configuration found. Run "200notes init" first.'));
    return;
  }

  const apiClient = new NotesApiClient(config);

  console.log(chalk.blue(`📋 Project: ${projectConfig.name}`));
  console.log(chalk.gray(`ID: ${projectConfig.projectId}`));
  console.log();

  // Get tasks with filters
  const filters: any = {};
  if (options.filter) {
    filters.status = options.filter;
  }
  if (options.priority) {
    filters.priority = options.priority;
  }

  const tasks = await apiClient.getTasks(projectConfig.projectId, filters);

  if (tasks.length === 0) {
    console.log(chalk.yellow('No tasks found.'));
    return;
  }

  // Group tasks by status
  const tasksByStatus = groupTasksByStatus(tasks);

  // Show summary
  const totalTasks = tasks.length;
  const completedTasks = tasksByStatus.done?.length || 0;
  const inProgressTasks = tasksByStatus.in_progress?.length || 0;
  const todoTasks = tasksByStatus.todo?.length || 0;

  console.log(chalk.bold('📊 Summary:'));
  console.log(`  Total: ${totalTasks}`);
  console.log(`  ${getStatusIcon('done')} Completed: ${completedTasks}`);
  console.log(`  ${getStatusIcon('in_progress')} In Progress: ${inProgressTasks}`);
  console.log(`  ${getStatusIcon('todo')} Todo: ${todoTasks}`);
  
  if (completedTasks > 0) {
    const completionRate = Math.round((completedTasks / totalTasks) * 100);
    console.log(`  Progress: ${completionRate}%`);
  }
  
  console.log();

  // Show tasks by status
  const statusOrder = ['in_progress', 'todo', 'done'];
  
  for (const status of statusOrder) {
    const statusTasks = tasksByStatus[status];
    if (!statusTasks || statusTasks.length === 0) continue;

    // Skip completed tasks unless --all is specified
    if (status === 'done' && !options.all) continue;

    console.log(chalk.bold(`${getStatusIcon(status)} ${getStatusLabel(status)} (${statusTasks.length}):`));
    
    statusTasks.forEach((task) => {
      console.log(`  ${formatTask(task)}`);
    });
    
    console.log();
  }

  // Show recent activity
  if (projectConfig.lastSync) {
    const lastSync = new Date(projectConfig.lastSync);
    const timeSince = getTimeSince(lastSync);
    console.log(chalk.gray(`Last sync: ${timeSince}`));
  }
}

function groupTasksByStatus(tasks: Task[]): Record<string, Task[]> {
  return tasks.reduce((groups, task) => {
    const status = task.status;
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(task);
    return groups;
  }, {} as Record<string, Task[]>);
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'todo':
      return '⏳';
    case 'in_progress':
      return '🚧';
    case 'done':
      return '✅';
    default:
      return '📝';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'todo':
      return 'Todo';
    case 'in_progress':
      return 'In Progress';
    case 'done':
      return 'Completed';
    default:
      return status;
  }
}

function formatTask(task: Task): string {
  let output = `${getPriorityIcon(task.priority)} ${task.title}`;
  
  if (task.tags && task.tags.length > 0) {
    const tags = task.tags.map(tag => chalk.cyan(`#${tag}`)).join(' ');
    output += ` ${tags}`;
  }
  
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const isOverdue = dueDate < new Date() && task.status !== 'done';
    const dueDateStr = dueDate.toLocaleDateString();
    
    if (isOverdue) {
      output += ` ${chalk.red(`⚠️ Due: ${dueDateStr}`)}`;
    } else {
      output += ` ${chalk.gray(`Due: ${dueDateStr}`)}`;
    }
  }
  
  if (task.assignee) {
    output += ` ${chalk.gray(`@${task.assignee.name}`)}`;
  }
  
  return output;
}

function getPriorityIcon(priority: string): string {
  switch (priority) {
    case 'high':
      return '🔴';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '⚪';
  }
}

function getTimeSince(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else {
    return 'Just now';
  }
}