// Main exports for the 200notes Claude Code integration library

export { NotesApiClient } from './lib/api';
export { ConfigManager } from './lib/config';
export { TaskMappingEngine } from './lib/taskMapping';
export { ClaudeMdManager } from './lib/claudeMd';

export * from './types';

// CLI commands exports (for programmatic usage)
export { createInitCommand } from './commands/init';
export { createStatusCommand } from './commands/status';
export { createTaskCommand } from './commands/task';