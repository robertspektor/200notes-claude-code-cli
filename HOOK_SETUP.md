# Claude Code Hook Setup Guide

## 🎯 Overview

This guide shows you how to activate the automatic task tracking hooks in Claude Code.

## 📋 Prerequisites

1. **200notes CLI installed and configured**:
   ```bash
   npm install -g @200notes/claude-code
   200notes auth login
   ```

2. **Project initialized**:
   ```bash
   cd your-project/
   200notes init "Your Project Name"
   ```

3. **Claude Code installed** and working

## 🔧 Hook Installation

### Method 1: Automatic Setup (Recommended)

The 200notes CLI can automatically configure Claude Code hooks:

```bash
# In your project directory
200notes init --setup-hooks

# Or if already initialized:
200notes setup hooks
```

### Method 2: Manual Setup

#### Step 1: Locate Claude Code Settings

Find your Claude Code settings directory:

- **macOS**: `~/.config/claude-code/`
- **Linux**: `~/.config/claude-code/`
- **Windows**: `%APPDATA%\claude-code\`

#### Step 2: Create/Update settings.json

Edit `~/.config/claude-code/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "name": "200notes-task-tracker",
        "description": "Automatically update 200notes tasks based on file changes",
        "script": "./hooks/post_tool_use.sh",
        "enabled": true,
        "config": {
          "debug": false,
          "exclude_patterns": ["node_modules/**", "dist/**", ".git/**", "*.log"],
          "supported_tools": ["Edit", "Write", "MultiEdit", "Bash"]
        }
      }
    ]
  }
}
```

#### Step 3: Copy Hook Scripts

Copy the hook scripts to your project:

```bash
# Copy hooks from the 200notes package
cp -r "$(npm root -g)/@200notes/claude-code/hooks" ./hooks/

# Make executable
chmod +x hooks/*.sh
```

## ✅ Verification

### Test Hook Installation

1. **Check hook is recognized**:
   ```bash
   # This should show the hook is loaded
   claude-code --hooks-status
   ```

2. **Test automatic task tracking**:
   ```bash
   # Create a test task
   200notes task create "Test automatic tracking" --tags test,hook

   # Make a code change through Claude Code
   # The task should automatically move to "in_progress"
   
   # Check status
   200notes status
   ```

### Debug Mode

Enable debug logging to see hook activity:

```bash
# Enable debug in your project
export DEBUG=true

# Or permanently in settings.json:
{
  "hooks": {
    "PostToolUse": [
      {
        "config": {
          "debug": true
        }
      }
    ]
  }
}
```

View hook logs:
```bash
# Hook logs go to stderr
claude-code 2>debug.log

# Check the logs
tail -f debug.log
```

## 🎮 How It Works

### File Change Detection

When you use Claude Code to modify files, the hook:

1. **Extracts keywords** from the file path:
   ```
   src/auth/LoginController.php → ["auth", "login", "controller"]
   tests/Feature/PaymentTest.php → ["payment", "test", "feature"]
   ```

2. **Finds matching tasks** with those keywords in title, description, or tags

3. **Updates task status**:
   - `todo` → `in_progress` when files are modified
   - `in_progress` → `done` when commit contains "closes #123"

### Commit Pattern Recognition

The hook recognizes completion patterns in commit messages:

```bash
git commit -m "closes #123: Implement user authentication"
# → Task #123 automatically marked as "done"

git commit -m "fixes #456: Fix payment validation bug"
# → Task #456 automatically marked as "done"
```

### CLAUDE.md Auto-Update

After significant code changes, CLAUDE.md is automatically regenerated with:

- Current task status
- Recent changes
- Suggested next steps
- Team assignments

## 🔍 Troubleshooting

### Hook Not Running

1. **Check hook script exists and is executable**:
   ```bash
   ls -la hooks/post_tool_use.sh
   chmod +x hooks/post_tool_use.sh
   ```

2. **Verify Claude Code settings**:
   ```bash
   cat ~/.config/claude-code/settings.json
   ```

3. **Test hook manually**:
   ```bash
   TOOL_TYPE="Edit" FILE_PATH="test.js" ./hooks/post_tool_use.sh
   ```

### Tasks Not Updating

1. **Check 200notes configuration**:
   ```bash
   200notes auth status
   ls -la .200notes.json
   ```

2. **Verify task keywords match**:
   ```bash
   # Debug keyword extraction
   DEBUG=true 200notes task update dummy --file-keywords "auth,payment" --status in_progress
   ```

3. **Check API connectivity**:
   ```bash
   200notes status
   ```

### Permission Issues

```bash
# Fix common permission issues
chmod +x hooks/*.sh
chown $(whoami) hooks/*.sh

# For global npm installations
sudo chown -R $(whoami) "$(npm root -g)/@200notes"
```

## 🚀 Advanced Configuration

### Custom Keyword Mapping

Edit `.200notes.json` to add custom mappings:

```json
{
  "projectId": "...",
  "name": "...",
  "customMappings": {
    "stripe": ["payment", "checkout", "billing"],
    "auth": ["login", "user", "session"],
    "api": ["endpoint", "route", "controller"]
  },
  "excludePatterns": [
    "node_modules/**",
    "dist/**",
    "*.log",
    "tmp/**"
  ]
}
```

### Team Hooks

For team projects, commit the hook configuration:

```bash
# Add to version control
git add hooks/ .200notes.json
git commit -m "Add 200notes hook configuration"

# Team members can then run:
200notes setup hooks --from-config
```

## 🎯 Best Practices

1. **Use descriptive task titles** that match file paths:
   - ✅ "Implement Stripe payment integration" 
   - ❌ "Do payments"

2. **Tag tasks appropriately**:
   ```bash
   200notes task create "User authentication" --tags auth,backend,security
   ```

3. **Use commit conventions**:
   ```bash
   git commit -m "feat: closes #123 - Add user login endpoint"
   git commit -m "fix: resolves #456 - Fix payment validation"
   ```

4. **Keep CLAUDE.md in .gitignore**:
   ```gitignore
   # Auto-generated by 200notes
   CLAUDE.md
   .200notes-session.json
   ```

## 📞 Support

- **Documentation**: [docs.200notes.com/claude-code](https://docs.200notes.com/claude-code)
- **Issues**: [GitHub Issues](https://github.com/robertspektor/200notes-claude-code-cli/issues)
- **Email**: support@200notes.com

---

**Status**: ✅ Hook integration fully implemented and ready to use