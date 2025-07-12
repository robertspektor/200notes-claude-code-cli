import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config';
import { NotesApiClient } from '../lib/api';
import { TaskMappingEngine } from '../lib/taskMapping';

export function createTaskCommand(): Command {
  const taskCommand = new Command('task')
    .description('Manage tasks');

  taskCommand
    .command('create')
    .description('Create a new task')
    .argument('[title]', 'Task title')
    .option('-d, --description <desc>', 'Task description')
    .option('-p, --priority <priority>', 'Task priority (low, medium, high)', 'medium')
    .option('-s, --status <status>', 'Task status (todo, in_progress, done)', 'todo')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('--due <date>', 'Due date (YYYY-MM-DD)')
    .action(async (title, options) => {
      try {
        await createTask(title, options);
      } catch (error) {
        console.error(chalk.red('Error creating task:'), error.message);
        process.exit(1);
      }
    });

  taskCommand
    .command('update')
    .description('Update a task')
    .argument('<taskId>', 'Task ID')
    .option('-t, --title <title>', 'Task title')
    .option('-d, --description <desc>', 'Task description')
    .option('-p, --priority <priority>', 'Task priority (low, medium, high)')
    .option('-s, --status <status>', 'Task status (todo, in_progress, done)')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--due <date>', 'Due date (YYYY-MM-DD)')
    .option('--file-keywords <keywords>', 'Update tasks matching file keywords')
    .action(async (taskId, options) => {
      try {
        if (options.fileKeywords) {
          await updateTasksByKeywords(options.fileKeywords, options);
        } else {
          await updateTask(parseInt(taskId), options);
        }
      } catch (error) {
        console.error(chalk.red('Error updating task:'), error.message);
        process.exit(1);
      }
    });

  taskCommand
    .command('done')
    .description('Mark task as done')
    .argument('<taskId>', 'Task ID or title')
    .action(async (taskIdOrTitle) => {
      try {
        await markTaskDone(taskIdOrTitle);
      } catch (error) {
        console.error(chalk.red('Error marking task as done:'), error.message);
        process.exit(1);
      }
    });

  taskCommand
    .command('start')
    .description('Mark task as in progress')
    .argument('<taskId>', 'Task ID or title')
    .action(async (taskIdOrTitle) => {
      try {
        await startTask(taskIdOrTitle);
      } catch (error) {
        console.error(chalk.red('Error starting task:'), error.message);
        process.exit(1);
      }
    });

  taskCommand
    .command('delete')
    .description('Delete a task')
    .argument('<taskId>', 'Task ID')
    .option('-f, --force', 'Skip confirmation')
    .action(async (taskId, options) => {
      try {
        await deleteTask(parseInt(taskId), options);
      } catch (error) {
        console.error(chalk.red('Error deleting task:'), error.message);
        process.exit(1);
      }
    });

  return taskCommand;
}

async function getApiClientAndProject() {
  const config = await ConfigManager.getApiConfig();
  if (!config) {
    throw new Error('No configuration found. Run "200notes init" first.');
  }

  const projectConfig = await ConfigManager.getProjectConfig();
  if (!projectConfig) {
    throw new Error('No project configuration found. Run "200notes init" first.');
  }

  const apiClient = new NotesApiClient(config);
  return { apiClient, projectConfig };
}

async function createTask(
  title?: string,
  options: {
    description?: string;
    priority?: string;
    status?: string;
    tags?: string;
    due?: string;
  } = {}
): Promise<void> {
  const { apiClient, projectConfig } = await getApiClientAndProject();

  let taskData: any = {};

  if (!title) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Task title:',
        validate: (input) => input.trim() !== '' || 'Task title is required',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Task description (optional):',
      },
      {
        type: 'list',
        name: 'priority',
        message: 'Priority:',
        choices: ['low', 'medium', 'high'],
        default: 'medium',
      },
      {
        type: 'list',
        name: 'status',
        message: 'Status:',
        choices: ['todo', 'in_progress', 'done'],
        default: 'todo',
      },
      {
        type: 'input',
        name: 'tags',
        message: 'Tags (comma-separated, optional):',
      },
      {
        type: 'input',
        name: 'due',
        message: 'Due date (YYYY-MM-DD, optional):',
        validate: (input) => {
          if (!input) return true;
          const date = new Date(input);
          return !isNaN(date.getTime()) || 'Invalid date format';
        },
      },
    ]);

    taskData = answers;
  } else {
    taskData = { title, ...options };
  }

  // Process tags
  if (taskData.tags) {
    taskData.tags = taskData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
  }

  // Validate priority and status
  if (taskData.priority && !['low', 'medium', 'high'].includes(taskData.priority)) {
    throw new Error('Priority must be one of: low, medium, high');
  }

  if (taskData.status && !['todo', 'in_progress', 'done'].includes(taskData.status)) {
    throw new Error('Status must be one of: todo, in_progress, done');
  }

  console.log(chalk.gray('Creating task...'));
  const task = await apiClient.createTask(projectConfig.projectId, taskData);

  console.log(chalk.green(`✅ Task created: ${task.title} (ID: ${task.id})`));
}

async function updateTask(
  taskId: number,
  options: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    tags?: string;
    due?: string;
  }
): Promise<void> {
  const { apiClient } = await getApiClientAndProject();

  const updates: any = {};

  if (options.title) updates.title = options.title;
  if (options.description !== undefined) updates.description = options.description;
  if (options.priority) updates.priority = options.priority;
  if (options.status) updates.status = options.status;
  if (options.due !== undefined) updates.due_date = options.due || null;

  if (options.tags !== undefined) {
    updates.tags = options.tags
      ? options.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      : [];
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updates provided');
  }

  console.log(chalk.gray('Updating task...'));
  const task = await apiClient.updateTask(taskId, updates);

  console.log(chalk.green(`✅ Task updated: ${task.title}`));
}

async function markTaskDone(taskIdOrTitle: string): Promise<void> {
  const { apiClient, projectConfig } = await getApiClientAndProject();

  let taskId: number;

  // Check if input is a number (task ID) or string (title)
  if (/^\d+$/.test(taskIdOrTitle)) {
    taskId = parseInt(taskIdOrTitle);
  } else {
    // Search by title
    const tasks = await apiClient.findTasksByKeywords(projectConfig.projectId, [taskIdOrTitle]);
    
    if (tasks.length === 0) {
      throw new Error(`No task found with title containing: ${taskIdOrTitle}`);
    }

    if (tasks.length > 1) {
      const { selectedTask } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedTask',
          message: 'Multiple tasks found. Select one:',
          choices: tasks.map(task => ({
            name: `${task.title} (ID: ${task.id}) - ${task.status}`,
            value: task,
          })),
        },
      ]);
      taskId = selectedTask.id;
    } else {
      taskId = tasks[0].id;
    }
  }

  console.log(chalk.gray('Marking task as done...'));
  const task = await apiClient.updateTaskStatus(taskId, 'done');

  console.log(chalk.green(`✅ Task completed: ${task.title}`));
}

async function startTask(taskIdOrTitle: string): Promise<void> {
  const { apiClient, projectConfig } = await getApiClientAndProject();

  let taskId: number;

  // Similar logic to markTaskDone but for starting tasks
  if (/^\d+$/.test(taskIdOrTitle)) {
    taskId = parseInt(taskIdOrTitle);
  } else {
    const tasks = await apiClient.findTasksByKeywords(projectConfig.projectId, [taskIdOrTitle]);
    
    if (tasks.length === 0) {
      throw new Error(`No task found with title containing: ${taskIdOrTitle}`);
    }

    if (tasks.length > 1) {
      const { selectedTask } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedTask',
          message: 'Multiple tasks found. Select one:',
          choices: tasks.map(task => ({
            name: `${task.title} (ID: ${task.id}) - ${task.status}`,
            value: task,
          })),
        },
      ]);
      taskId = selectedTask.id;
    } else {
      taskId = tasks[0].id;
    }
  }

  console.log(chalk.gray('Starting task...'));
  const task = await apiClient.updateTaskStatus(taskId, 'in_progress');

  console.log(chalk.green(`🚧 Task started: ${task.title}`));
}

async function deleteTask(taskId: number, options: { force?: boolean }): Promise<void> {
  const { apiClient } = await getApiClientAndProject();

  if (!options.force) {
    const task = await apiClient.getTask(taskId);
    
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Are you sure you want to delete task "${task.title}"?`,
        default: false,
      },
    ]);

    if (!confirmed) {
      console.log(chalk.yellow('Delete cancelled.'));
      return;
    }
  }

  console.log(chalk.gray('Deleting task...'));
  await apiClient.deleteTask(taskId);

  console.log(chalk.green('✅ Task deleted'));
}

async function updateTasksByKeywords(
  keywords: string,
  options: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    tags?: string;
    due?: string;
  }
): Promise<void> {
  const { apiClient, projectConfig } = await getApiClientAndProject();

  // Parse keywords
  const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean);
  
  console.log(chalk.gray(`Searching for tasks with keywords: ${keywordList.join(', ')}`));
  
  // Find matching tasks
  const tasks = await apiClient.findTasksByKeywords(projectConfig.projectId, keywordList);
  
  if (tasks.length === 0) {
    console.log(chalk.yellow('No tasks found matching the provided keywords.'));
    return;
  }

  console.log(chalk.blue(`Found ${tasks.length} matching task(s):`));
  tasks.forEach(task => {
    console.log(chalk.gray(`  - ${task.title} (ID: ${task.id}) - ${task.status}`));
  });

  // Prepare updates
  const updates: any = {};
  if (options.title) updates.title = options.title;
  if (options.description !== undefined) updates.description = options.description;
  if (options.priority) updates.priority = options.priority;
  if (options.status) updates.status = options.status;
  if (options.due !== undefined) updates.due_date = options.due || null;

  if (options.tags !== undefined) {
    updates.tags = options.tags
      ? options.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      : [];
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updates provided');
  }

  // Update each matching task
  console.log(chalk.gray('Updating matching tasks...'));
  
  for (const task of tasks) {
    try {
      await apiClient.updateTask(task.id, updates);
      console.log(chalk.green(`✅ Updated: ${task.title}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to update ${task.title}: ${error.message}`));
    }
  }
}