#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createInitCommand } from './commands/init';
import { createStatusCommand } from './commands/status';
import { createTaskCommand } from './commands/task';

const program = new Command();

program
  .name('200notes')
  .description('Claude Code integration for 200notes project management')
  .version('0.1.0');

// Global options
program
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--debug', 'Enable debug mode');

// Commands
program.addCommand(createInitCommand());
program.addCommand(createStatusCommand());
program.addCommand(createTaskCommand());

// Auth command
program
  .command('auth')
  .description('Manage authentication')
  .addCommand(
    new Command('login')
      .description('Configure API credentials')
      .option('--api-key <key>', 'API key')
      .option('--api-secret <secret>', 'API secret')
      .action(async (options) => {
        const inquirer = (await import('inquirer')).default;
        const { ConfigManager } = await import('./lib/config');

        console.log(chalk.blue('🔐 Configure 200notes API credentials\n'));

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
            message: 'Enter the base URL:',
            default: 'https://200notes.com',
          },
        ]);

        const config = {
          apiKey: answers.apiKey.trim(),
          apiSecret: answers.apiSecret.trim(),
          baseUrl: answers.baseUrl.trim(),
        };

        await ConfigManager.setGlobalConfig(config);
        console.log(chalk.green('✅ Credentials saved successfully!'));
      })
  )
  .addCommand(
    new Command('logout')
      .description('Remove stored credentials')
      .action(async () => {
        const inquirer = (await import('inquirer')).default;
        const { ConfigManager } = await import('./lib/config');

        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: 'Are you sure you want to remove stored credentials?',
            default: false,
          },
        ]);

        if (confirmed) {
          await ConfigManager.removeGlobalConfig();
          console.log(chalk.green('✅ Credentials removed'));
        } else {
          console.log(chalk.yellow('Logout cancelled'));
        }
      })
  )
  .addCommand(
    new Command('status')
      .description('Check authentication status')
      .action(async () => {
        const { ConfigManager } = await import('./lib/config');
        const { NotesApiClient } = await import('./lib/api');

        const config = await ConfigManager.getGlobalConfig();
        
        if (!config || !config.apiKey || !config.apiSecret) {
          console.log(chalk.red('❌ Not authenticated'));
          console.log(chalk.gray('Run "200notes auth login" to configure credentials'));
          return;
        }

        console.log(chalk.green('✅ Authenticated'));
        console.log(chalk.gray(`API Key: ${config.apiKey.substring(0, 8)}...`));
        console.log(chalk.gray(`Base URL: ${config.baseUrl}`));

        // Test connection
        try {
          const apiClient = new NotesApiClient(config);
          const connectionValid = await apiClient.testConnection();
          
          if (connectionValid) {
            console.log(chalk.green('✅ API connection successful'));
          } else {
            console.log(chalk.red('❌ API connection failed'));
          }
        } catch (error) {
          console.log(chalk.red('❌ API connection error:'), error.message);
        }
      })
  );

// Sync command
program
  .command('sync')
  .description('Synchronize with 200notes')
  .option('--update-claude-md', 'Update CLAUDE.md with current project context')
  .action(async (options) => {
    console.log(chalk.blue('🔄 Synchronizing with 200notes...'));
    
    const { ConfigManager } = await import('./lib/config');
    const { NotesApiClient } = await import('./lib/api');
    const { ClaudeMdManager } = await import('./lib/claudeMd');
    
    const apiConfig = await ConfigManager.getApiConfig();
    const projectConfig = await ConfigManager.getProjectConfig();
    
    if (!apiConfig || !projectConfig) {
      console.error(chalk.red('No configuration found. Run "200notes init" first.'));
      return;
    }

    // Sync with API
    const apiClient = new NotesApiClient(apiConfig);
    const tasks = await apiClient.getTasks(projectConfig.projectId);
    
    // Update CLAUDE.md if requested
    if (options.updateClaudeMd) {
      console.log(chalk.gray('📝 Updating CLAUDE.md...'));
      
      // Create a project object for ClaudeMdManager
      const project = {
        id: projectConfig.projectId,
        name: projectConfig.name,
        description: '',
        owner_id: 0,
        is_favorite: false,
        created_at: '',
        updated_at: ''
      };
      
      await ClaudeMdManager.updateClaudeMd(project, tasks);
      
      console.log(chalk.green('✅ CLAUDE.md updated'));
    }

    // Update last sync time
    await ConfigManager.updateProjectConfig({
      lastSync: new Date().toISOString(),
    });

    console.log(chalk.green('✅ Sync completed'));
  });

// Version command override for better formatting
program
  .command('version')
  .description('Show version information')
  .action(() => {
    console.log(chalk.blue('200notes Claude Code Integration'));
    console.log(`Version: ${program.version()}`);
    console.log('Repository: https://github.com/200notes/claude-code-integration');
  });

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (error) {
  if (error.code === 'commander.helpDisplayed') {
    process.exit(0);
  }
  
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
}

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}