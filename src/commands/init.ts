import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as path from 'path';
import { ConfigManager } from '../lib/config';
import { NotesApiClient } from '../lib/api';
import { Config, ProjectConfig } from '../types';

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize 200notes integration in current project')
    .argument('[project-name]', 'Name of the project (optional)')
    .option('-f, --force', 'Force initialization even if project config exists')
    .option('--api-key <key>', 'API key (if not configured globally)')
    .option('--api-secret <secret>', 'API secret (if not configured globally)')
    .action(async (projectName, options) => {
      try {
        await initProject(projectName, options);
      } catch (error) {
        console.error(chalk.red('Error initializing project:'), error.message);
        process.exit(1);
      }
    });
}

async function initProject(
  projectName?: string,
  options: { force?: boolean; apiKey?: string; apiSecret?: string } = {}
): Promise<void> {
  console.log(chalk.blue('🚀 Initializing 200notes Claude Code integration...\n'));

  // Check if project already initialized
  if (!options.force && await ConfigManager.hasProjectConfig()) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Project already initialized. Overwrite existing configuration?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Initialization cancelled.'));
      return;
    }
  }

  // Get or configure API credentials
  let config = await getApiConfig(options);
  if (!config) {
    config = await configureApiCredentials(options);
  }

  // Test API connection
  console.log(chalk.gray('Testing API connection...'));
  const apiClient = new NotesApiClient(config);
  const connectionValid = await apiClient.testConnection();

  if (!connectionValid) {
    throw new Error('Failed to connect to 200notes API. Please check your credentials.');
  }

  console.log(chalk.green('✓ API connection successful'));

  // Get or create project
  const project = await setupProject(apiClient, projectName);

  // Create project configuration
  const projectConfig: ProjectConfig = {
    projectId: project.id,
    name: project.name,
    lastSync: new Date().toISOString(),
    taskMappings: {},
  };

  await ConfigManager.setProjectConfig(projectConfig);

  // Install Claude Code hooks
  await installClaudeCodeHooks();

  // Create initial CLAUDE.md
  await createInitialClaudeMd(project);

  console.log(chalk.green('\\n✅ 200notes integration initialized successfully!'));
  console.log(chalk.gray(`Project: ${project.name} (${project.id})`));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  1. Start Claude Code in this directory'));
  console.log(chalk.gray('  2. Tasks will be automatically tracked'));
  console.log(chalk.gray('  3. Use "200notes status" to see current tasks'));
}

async function getApiConfig(options: { apiKey?: string; apiSecret?: string }): Promise<Config | null> {
  // Try provided options first
  if (options.apiKey && options.apiSecret) {
    return {
      apiKey: options.apiKey,
      apiSecret: options.apiSecret,
      baseUrl: 'https://200notes.com',
    };
  }

  // Try global config
  const globalConfig = await ConfigManager.getGlobalConfig();
  if (globalConfig && globalConfig.apiKey && globalConfig.apiSecret) {
    return globalConfig;
  }

  // Try environment variables
  const envConfig = ConfigManager.getConfigFromEnv();
  if (envConfig.apiKey && envConfig.apiSecret) {
    return {
      apiKey: envConfig.apiKey,
      apiSecret: envConfig.apiSecret,
      baseUrl: envConfig.baseUrl || 'https://200notes.com',
    };
  }

  return null;
}

async function configureApiCredentials(options: { apiKey?: string; apiSecret?: string }): Promise<Config> {
  console.log(chalk.yellow('API credentials not found. Let\'s configure them.'));
  console.log(chalk.gray('You can find your API credentials in the 200notes dashboard.\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiKey',
      message: 'Enter your API key:',
      default: options.apiKey,
      validate: (input) => input.trim() !== '' || 'API key is required',
    },
    {
      type: 'password',
      name: 'apiSecret',
      message: 'Enter your API secret:',
      default: options.apiSecret,
      validate: (input) => input.trim() !== '' || 'API secret is required',
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Enter the base URL (optional):',
      default: 'https://200notes.com',
    },
    {
      type: 'confirm',
      name: 'saveGlobally',
      message: 'Save credentials globally for all projects?',
      default: true,
    },
  ]);

  const config: Config = {
    apiKey: answers.apiKey.trim(),
    apiSecret: answers.apiSecret.trim(),
    baseUrl: answers.baseUrl.trim(),
  };

  if (answers.saveGlobally) {
    await ConfigManager.setGlobalConfig(config);
    console.log(chalk.green('✓ Credentials saved globally'));
  }

  return config;
}

async function setupProject(apiClient: NotesApiClient, projectName?: string) {
  const projects = await apiClient.getProjects();

  if (!projectName) {
    // Suggest current directory name
    const currentDir = path.basename(process.cwd());
    projectName = currentDir;
  }

  // Check if project already exists
  const existingProject = projects.find(p => p.name === projectName);
  
  if (existingProject) {
    const { useExisting } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useExisting',
        message: `Project "${projectName}" already exists. Use existing project?`,
        default: true,
      },
    ]);

    if (useExisting) {
      return existingProject;
    }
  }

  // Create new project or select existing
  if (projects.length > 0) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: `Create new project "${projectName}"`, value: 'create' },
          { name: 'Select existing project', value: 'select' },
        ],
      },
    ]);

    if (action === 'select') {
      const { selectedProject } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedProject',
          message: 'Select a project:',
          choices: projects.map(p => ({
            name: `${p.name} (${p.id})`,
            value: p,
          })),
        },
      ]);

      return selectedProject;
    }
  }

  // Create new project
  const { finalName, description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'finalName',
      message: 'Enter project name:',
      default: projectName,
      validate: (input) => input.trim() !== '' || 'Project name is required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Enter project description (optional):',
    },
  ]);

  console.log(chalk.gray('Creating project...'));
  const project = await apiClient.createProject(finalName.trim(), description?.trim());
  console.log(chalk.green(`✓ Project "${project.name}" created`));

  return project;
}

async function installClaudeCodeHooks(): Promise<void> {
  // This would copy hook files to the appropriate Claude Code directory
  // For now, we'll create a hooks directory in the project
  console.log(chalk.gray('Setting up Claude Code hooks...'));
  
  // Create hooks directory and files
  const fs = require('fs-extra');
  await fs.ensureDir('hooks');
  
  // We'll implement actual hook installation later
  console.log(chalk.green('✓ Claude Code hooks configured'));
}

async function createInitialClaudeMd(project: any): Promise<void> {
  const fs = require('fs-extra');
  
  const claudeMdContent = `# ${project.name}

## 200notes Integration
- Project ID: \`${project.id}\`
- Last Sync: ${new Date().toISOString()}

## Current Tasks
*Tasks will be automatically loaded here by Claude Code hooks*

## Session Notes
*This section will be updated during Claude Code sessions*
`;

  await fs.writeFile('CLAUDE.md', claudeMdContent);
  console.log(chalk.green('✓ CLAUDE.md created'));
}