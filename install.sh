#!/bin/bash

# 200notes Claude Code Integration Installer
# This script installs the 200notes CLI from source

set -e

echo "🚀 Installing 200notes Claude Code Integration..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION'))" 2>/dev/null; then
    echo "❌ Node.js version $NODE_VERSION detected, but version $REQUIRED_VERSION+ is required."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed."
    exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ git is required but not installed."
    exit 1
fi

echo "✅ Prerequisites satisfied"

# Create temporary directory
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

echo "📦 Downloading 200notes Claude Code integration..."

# Clone the repository
git clone https://github.com/200notes/claude-code-integration.git
cd claude-code-integration

echo "🔨 Building package..."

# Install dependencies
npm install --production

# Build the package
npm run build

echo "🔗 Installing globally..."

# Install globally
npm link

# Cleanup
cd ~
rm -rf "$TMP_DIR"

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎉 You can now use the '200notes' command:"
echo "   200notes --version"
echo "   200notes init \"My Project\""
echo ""
echo "📖 Documentation: https://docs.200notes.com/claude-code"
echo "🆘 Support: support@200notes.com"
echo ""
echo "Happy coding! 🚀"