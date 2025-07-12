# 200notes Claude Code Integration

[![npm version](https://badge.fury.io/js/%40200notes%2Fclaude-code.svg)](https://badge.fury.io/js/%40200notes%2Fclaude-code)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Seamless integration between Claude Code and 200notes project management. Automatically track tasks, update progress, and maintain project context during your AI-assisted development sessions.

## ✨ Features

- **🔄 Automatic Task Tracking**: Tasks are automatically updated based on your code changes
- **🤖 Claude Code Hooks**: Intelligent hooks that understand your development workflow
- **📋 Smart Task Mapping**: Advanced algorithms to map code changes to relevant tasks
- **📝 CLAUDE.md Integration**: Automatically generated project context for Claude
- **🚀 CLI Tools**: Powerful command-line interface for project management
- **⚡ Real-time Sync**: Keep your team in sync with automatic progress updates

## 🚀 Quick Start

### Installation

#### Option 1: NPM (Coming Soon)
```bash
npm install -g @200notes/claude-code
```
*Note: The NPM package will be available soon. Use the alternative methods below for now.*

#### Option 2: Quick Install Script (Recommended)
```bash
# One-line installer
curl -fsSL https://raw.githubusercontent.com/robertspektor/200notes-claude-code-cli/main/install.sh | bash
```

#### Option 3: Manual Git Installation
```bash
# Clone and build the package
git clone https://github.com/robertspektor/200notes-claude-code-cli.git
cd 200notes-claude-code-cli
npm install
npm run build

# Install globally
npm link
```

#### Option 4: Direct Download
```bash
# Download and install latest release
curl -L https://github.com/robertspektor/200notes-claude-code-cli/archive/main.zip -o claude-code.zip
unzip claude-code.zip
cd 200notes-claude-code-cli-main
npm install && npm run build && npm link
```

#### Option 5: Using npx (After NPM release)
```bash
npx @200notes/claude-code init "My Project"
```

### Setup

1. **Configure your API credentials** (get them from your 200notes dashboard):
```bash
200notes auth login
```

2. **Initialize your project**:
```bash
cd your-project
200notes init "My Awesome Project"
```

3. **Start Claude Code** - tasks will now be automatically tracked!

### Example Workflow

```bash
# Check current project status
200notes status

# Create a new task
200notes task create "Implement user authentication" --priority high --tags auth,backend

# Start working on a task
200notes task start "authentication"

# Mark a task as completed
200notes task done 123
```

## 📖 How It Works

### Automatic Task Updates

When you make changes with Claude Code, the integration:

1. **Detects file changes** through Claude Code hooks
2. **Maps changes to tasks** using intelligent keyword matching
3. **Updates task status** automatically (todo → in_progress → done)
4. **Syncs with your team** in real-time

### Smart Task Mapping

The integration uses advanced algorithms to understand which tasks relate to your code changes:

- **File path analysis**: `src/auth/login.ts` → tasks tagged with "auth", "login"
- **Content analysis**: Function names, classes, imports
- **Keyword extraction**: Smart parsing of code comments and documentation
- **Pattern recognition**: Framework-specific patterns (React, Laravel, etc.)

### CLAUDE.md Integration

Your project automatically gets a `CLAUDE.md` file that provides Claude with:

- Current task status and priorities
- Project context and recent changes
- Suggested next steps
- Team member assignments

## 🛠️ CLI Reference

### Project Management

```bash
# Initialize project
200notes init [project-name]

# Show project status
200notes status
200notes status --all  # Include completed tasks
200notes status --filter todo  # Filter by status

# Sync with 200notes
200notes sync
```

### Task Management

```bash
# Create tasks
200notes task create "Task title"
200notes task create "Fix bug" --priority high --tags bug,urgent

# Update tasks
200notes task update 123 --status in_progress
200notes task update 123 --priority high --description "New description"

# Quick status changes
200notes task start 123  # Mark as in_progress
200notes task done 123   # Mark as completed

# Delete tasks
200notes task delete 123
```

### Authentication

```bash
# Login with API credentials
200notes auth login

# Check authentication status
200notes auth status

# Logout
200notes auth logout
```

## ⚙️ Configuration

### Global Configuration

Stored in `~/.config/200notes/config.json`:

```json
{
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret",
  "baseUrl": "https://200notes.com"
}
```

### Project Configuration

Stored in `.200notes.json` in your project root:

```json
{
  "projectId": "project-uuid",
  "name": "Project Name",
  "lastSync": "2024-01-15T10:30:00.000Z",
  "taskMappings": {
    "src/auth/": [123, 124, 125],
    "src/api/": [126, 127]
  },
  "settings": {
    "autoStartTasks": true,
    "autoCompleteTasks": false,
    "trackFileChanges": true,
    "excludePatterns": ["node_modules/**", "dist/**"]
  }
}
```

## 🔧 Claude Code Hooks

The integration installs Claude Code hooks that automatically:

### PostToolUse Hook

Runs after successful tool execution:

- **Edit/Write/MultiEdit**: Updates related tasks to "in_progress"
- **Bash commands**: Detects completion patterns in commits
- **File changes**: Maps modifications to relevant tasks

### Session Tracking

Tracks your development session:

- Files modified
- Tasks updated
- Time spent on different areas
- Progress summaries

## 🎯 Advanced Usage

### Custom Task Mapping

You can create custom mappings for better task detection:

```json
{
  "keywords": {
    "stripe": [123, 124],
    "payment": [123, 124, 125],
    "webhook": [126],
    "authentication": [127, 128]
  }
}
```

### Team Collaboration

When working in teams:

- **Conflict detection**: Warns when multiple people work on the same task
- **Status sync**: Real-time updates across team members
- **Assignment tracking**: See who's working on what

### Integration with Git

The hooks can parse git commit messages:

```bash
git commit -m "closes task #123: Implement user authentication"
# Automatically marks task #123 as completed
```

## 🔌 API Reference

### Programmatic Usage

```typescript
import { NotesApiClient, ConfigManager, TaskMappingEngine } from '@200notes/claude-code';

// Get API client
const config = await ConfigManager.getApiConfig();
const client = new NotesApiClient(config);

// Get project tasks
const tasks = await client.getTasks(projectId);

// Find related tasks
const keywords = TaskMappingEngine.extractKeywordsFromPath('src/auth/login.ts');
const relatedTasks = TaskMappingEngine.findMatchingTasks(tasks, keywords);

// Update task status
await client.updateTaskStatus(taskId, 'in_progress');
```

## 🌟 Examples

### Laravel Project

```bash
# Initialize Laravel project
200notes init "E-commerce API"

# Create tasks for common Laravel features
200notes task create "Setup authentication" --tags auth,laravel
200notes task create "Create product model" --tags model,products
200notes task create "Implement payment gateway" --tags stripe,payments

# Work on authentication - files in app/Http/Controllers/Auth/ 
# automatically update the auth task to "in_progress"
```

### React Project

```bash
# Initialize React project  
200notes init "Dashboard App"

# Create component-based tasks
200notes task create "User profile component" --tags react,components
200notes task create "API integration" --tags api,axios
200notes task create "State management" --tags redux,state

# Changes in src/components/UserProfile.tsx 
# automatically link to the profile component task
```

## 🔒 Security

- **API credentials** are stored securely in your local config
- **No code content** is sent to 200notes servers
- **Only metadata** (file paths, task mappings) are synchronized
- **Local processing** for keyword extraction and task mapping

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔧 Troubleshooting

### Installation Issues

#### "Package not found" error
```bash
npm error 404 Not Found - GET https://registry.npmjs.org/@200notes%2fclaude-code
```
**Solution**: The NPM package is not yet published. Use the [Git installation method](#option-2-install-from-git-current-method) instead.

#### Permission errors during global install
```bash
# Use sudo (macOS/Linux)
sudo npm link

# Or configure npm for global installs without sudo
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

#### "command not found: 200notes"
**Solution**: 
1. Ensure the package was linked successfully: `npm list -g @200notes/claude-code`
2. Check your PATH includes npm global bin: `npm config get prefix`
3. Restart your terminal

#### TypeScript compilation errors
```bash
# Ensure you have the right Node.js version
node --version  # Should be 18.0.0 or higher

# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Runtime Issues

#### "Authentication failed" errors
1. Verify your API credentials in 200notes dashboard
2. Check config file: `~/.config/200notes/config.json`
3. Re-authenticate: `200notes auth logout && 200notes auth login`

#### "Project not found" errors
1. Ensure you've run `200notes init` in your project directory
2. Check for `.200notes.json` file in project root
3. Verify project exists in 200notes dashboard

#### Tasks not updating automatically
1. Check that Claude Code hooks are installed: `ls -la hooks/`
2. Verify hook permissions: `chmod +x hooks/*.sh`
3. Check exclude patterns in `.200notes.json`

### Development Setup

For contributors and development:

```bash
# Clone the repository
git clone https://github.com/robertspektor/200notes-claude-code-cli.git
cd 200notes-claude-code-cli

# Install dependencies
npm install

# Build in watch mode
npm run dev

# Run tests
npm test

# Link for local development
npm link

# Test CLI locally
200notes --version
```

## 🆘 Support

- **Documentation**: [docs.200notes.com](https://docs.200notes.com)
- **Issues**: [GitHub Issues](https://github.com/robertspektor/200notes-claude-code-cli/issues)
- **Discord**: [Join our community](https://discord.gg/200notes)
- **Email**: support@200notes.com

---

Made with ❤️ by the 200notes team