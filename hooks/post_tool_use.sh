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
    
    # This is a placeholder for the actual implementation
    # In practice, this would:
    # 1. Find tasks related to the file
    # 2. Update their status to 'in_progress' if they're 'todo'
    # 3. Log the changes
    
    log "Would update tasks related to $file_path to in_progress"
    
    # Example implementation (commented out for now):
    # local keywords=$(find_related_tasks "$file_path")
    # if [[ -n "$keywords" ]]; then
    #     200notes task update --file-keywords "$keywords" --status in_progress
    # fi
}

# Check for completion patterns in commits or comments
check_completion_patterns() {
    local context="$1"
    
    # Look for completion keywords in git commits or code comments
    local completion_patterns=(
        "closes #"
        "fixes #"
        "resolves #"
        "completed"
        "finished"
        "done"
    )
    
    for pattern in "${completion_patterns[@]}"; do
        if [[ "$context" =~ $pattern ]]; then
            log "Completion pattern '$pattern' detected"
            # In practice, this would parse task IDs and mark them as done
            return 0
        fi
    done
    
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

# Main execution
main() {
    log "Starting post-tool-use hook"
    
    check_200notes_config
    parse_tool_info
    track_session_activity
    
    if [[ -n "$FILE_PATH" ]]; then
        update_task_status "$TOOL_TYPE" "$FILE_PATH"
    fi
    
    log "Post-tool-use hook completed"
}

# Error handling
trap 'error "Hook failed with exit code $?"' ERR

# Run main function
main "$@"