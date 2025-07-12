#!/bin/bash

# 200notes Claude Code Integration - Post Tool Use Hook
# This hook runs after successful tool execution to update task status

set -e

# Configuration
DEBUG=${DEBUG:-false}
HOOK_NAME="200notes-post-tool-use"

# Logging function
log() {
    if [[ "$DEBUG" == "true" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$HOOK_NAME] $1" >&2
    fi
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$HOOK_NAME] ERROR: $1" >&2
}

# Check if 200notes is configured
check_200notes_config() {
    if [[ ! -f ".200notes.json" ]]; then
        log "No .200notes.json found, skipping task updates"
        exit 0
    fi
    
    if ! command -v 200notes &> /dev/null; then
        log "200notes CLI not found, skipping task updates"
        exit 0
    fi
}

# Parse tool information from environment variables
parse_tool_info() {
    TOOL_TYPE="${TOOL_TYPE:-unknown}"
    FILE_PATH="${FILE_PATH:-}"
    CONTENT="${CONTENT:-}"
    
    log "Tool: $TOOL_TYPE, File: $FILE_PATH"
}

# Find related tasks based on file changes
find_related_tasks() {
    local file_path="$1"
    local tasks=()
    
    if [[ -z "$file_path" ]]; then
        return
    fi
    
    # Extract keywords from file path and content
    local filename=$(basename "$file_path")
    local dirname=$(dirname "$file_path")
    local base_name="${filename%.*}"
    
    # Common patterns to extract keywords
    local keywords=()
    
    # Add filename without extension
    keywords+=("$base_name")
    
    # Add directory name if meaningful
    if [[ "$dirname" != "." && "$dirname" != "/" ]]; then
        keywords+=("$(basename "$dirname")")
    fi
    
    # Look for specific patterns in filename
    if [[ "$filename" =~ ([A-Z][a-z]+) ]]; then
        keywords+=("${BASH_REMATCH[1]}")
    fi
    
    # Convert to comma-separated string for 200notes CLI
    local keyword_string=$(IFS=','; echo "${keywords[*]}")
    
    log "Searching for tasks with keywords: $keyword_string"
    
    # Use 200notes CLI to find related tasks (this would need to be implemented)
    # For now, we'll use a placeholder that suggests implementation
    echo "$keyword_string"
}

# Update task status based on tool type and content
update_task_status() {
    local tool_type="$1"
    local file_path="$2"
    
    case "$tool_type" in
        "Edit"|"Write"|"MultiEdit")
            log "Code changes detected, updating related tasks to 'in_progress'"
            update_tasks_to_in_progress "$file_path"
            ;;
        "Bash")
            log "Command execution detected, checking for completion patterns"
            check_completion_patterns "$file_path"
            ;;
        *)
            log "Tool type '$tool_type' doesn't trigger task updates"
            ;;
    esac
}

# Update tasks to in_progress status
update_tasks_to_in_progress() {
    local file_path="$1"
    
    local keywords=$(find_related_tasks "$file_path")
    if [[ -n "$keywords" && "$keywords" != "" ]]; then
        log "Updating tasks with keywords: $keywords"
        
        # Use the 200notes CLI to update matching tasks
        if 200notes task update dummy --file-keywords "$keywords" --status in_progress 2>/dev/null; then
            log "Successfully updated tasks related to $file_path"
        else
            log "No tasks updated for keywords: $keywords"
        fi
    else
        log "No keywords extracted from $file_path"
    fi
}

# Check for completion patterns in commits or comments
check_completion_patterns() {
    local context="$1"
    
    # Look for completion keywords in git commits or code comments
    local completion_patterns=(
        "closes #([0-9]+)"
        "fixes #([0-9]+)"
        "resolves #([0-9]+)"
        "completed.*#([0-9]+)"
        "finished.*#([0-9]+)"
        "done.*#([0-9]+)"
    )
    
    for pattern in "${completion_patterns[@]}"; do
        if [[ "$context" =~ $pattern ]]; then
            local task_id="${BASH_REMATCH[1]}"
            log "Completion pattern '$pattern' detected for task #$task_id"
            
            # Mark the specific task as done
            if [[ -n "$task_id" ]] && 200notes task done "$task_id" 2>/dev/null; then
                log "Task #$task_id marked as completed"
            fi
            return 0
        fi
    done
    
    # Also check for general completion without specific task ID
    if [[ "$context" =~ (completed|finished|done) ]]; then
        log "General completion pattern detected"
        # Could trigger CLAUDE.md regeneration here
        return 0
    fi
    
    return 1
}

# Track session activity
track_session_activity() {
    local session_file=".200notes-session.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Create or update session tracking
    if [[ ! -f "$session_file" ]]; then
        cat > "$session_file" << EOF
{
  "startTime": "$timestamp",
  "activities": [],
  "filesChanged": [],
  "tasksModified": []
}
EOF
    fi
    
    # Add current activity (simplified for demo)
    log "Tracking activity: $TOOL_TYPE on $FILE_PATH"
}

# Regenerate CLAUDE.md with current project context
regenerate_claude_md() {
    log "Regenerating CLAUDE.md with current project context"
    
    # Use the 200notes CLI to regenerate CLAUDE.md
    if command -v 200notes &> /dev/null; then
        if 200notes sync --update-claude-md 2>/dev/null; then
            log "CLAUDE.md successfully updated"
        else
            # Fallback: generate a basic CLAUDE.md
            generate_basic_claude_md
        fi
    else
        log "200notes CLI not available, skipping CLAUDE.md update"
    fi
}

# Generate a basic CLAUDE.md when CLI is not available
generate_basic_claude_md() {
    local claude_md_file="CLAUDE.md"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$claude_md_file" << EOF
# Project Context (Updated: $timestamp)

## Current Development Session
- Last activity: $TOOL_TYPE on $FILE_PATH
- Session tracked: $timestamp

## Project Status
Please use \`200notes status\` to get the current task overview.

## Recent Changes
- File modified: $FILE_PATH
- Tool used: $TOOL_TYPE

## Next Steps
1. Check current task status with \`200notes status\`
2. Review any related tasks for the modified files
3. Update task progress as needed

---
*This file is automatically generated by 200notes Claude Code integration.*
EOF

    log "Generated basic CLAUDE.md"
}

# Main execution
main() {
    log "Starting post-tool-use hook"
    
    check_200notes_config
    parse_tool_info
    track_session_activity
    
    if [[ -n "$FILE_PATH" ]]; then
        update_task_status "$TOOL_TYPE" "$FILE_PATH"
        
        # Regenerate CLAUDE.md after significant changes
        if [[ "$TOOL_TYPE" =~ ^(Edit|Write|MultiEdit)$ ]]; then
            regenerate_claude_md
        fi
    fi
    
    log "Post-tool-use hook completed"
}

# Error handling
trap 'error "Hook failed with exit code $?"' ERR

# Run main function
main "$@"