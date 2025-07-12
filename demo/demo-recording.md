# 🎬 200notes Claude Code Integration - Demo Recording Instructions

## 🎯 Demo Goal
Show how 200notes transforms manual PROJECT.md management into intelligent, automated task tracking integrated with Claude Code.

**Target Audience**: Developers who use Claude Code for AI-assisted development  
**Demo Duration**: 10-15 minutes  
**Key Message**: "Turn your PROJECT.md into a smart, automated project management system"

---

## 🎬 Recording Setup

### Screen Setup
- **Resolution**: 1920x1080 minimum
- **Browser**: Chrome/Safari with dark theme
- **Terminal**: Dark theme with clear, readable font (size 14+)
- **Windows**: Side-by-side terminal and browser for real-time updates

### Audio Setup
- Clear microphone with minimal background noise
- Practice script beforehand for smooth delivery
- Prepare for 10-15 minute recording with minimal cuts

### Preparation Checklist
- [ ] Build integration package (`npm run build`)
- [ ] Start mock 200notes server for demo
- [ ] Clean demo directory (remove any existing configs)
- [ ] Have 200notes dashboard open in browser
- [ ] Terminal ready in demo project directory

---

## 🎬 Recording Script

### **Scene 1: The Problem (1 minute)**

**Visual**: Show traditional PROJECT.md file

**Narration**:
> "If you're a developer using Claude Code, you probably have a PROJECT.md file like this one. Look at all these manual checkboxes - every time you complete a feature, you have to remember to manually update them. This is error-prone, often forgotten, and provides zero visibility to your team."

**Actions**:
1. Open `/demo/PROJECT.md`
2. Scroll through showing manual checkboxes
3. Highlight the pain points: "Stripe webhook ❌", "PDF download ❌"

---

### **Scene 2: Introducing the Solution (1 minute)**

**Visual**: 200notes website/dashboard

**Narration**:
> "What if your PROJECT.md could be smart? What if Claude Code could automatically track your progress and keep your team in sync? That's exactly what 200notes Claude Code integration does."

**Actions**:
1. Show 200notes landing page briefly
2. Highlight "Claude Code Integration" feature
3. Show a preview of the dashboard with real tasks

---

### **Scene 3: Installation & Setup (2 minutes)**

**Visual**: Terminal commands

**Narration**:
> "Let's see how easy it is to get started. First, we install the 200notes CLI globally, then configure our API credentials from the 200notes dashboard."

**Actions**:
```bash
# Installation
npm install -g @200notes/claude-code

# Authentication setup
200notes auth login
# Enter: demo_key_12345
# Enter: demo_secret_67890
# URL: https://demo.200notes.com

# Verify authentication
200notes auth status
```

**Result**: Show successful authentication confirmation

---

### **Scene 4: Project Initialization (2 minutes)**

**Visual**: Terminal + file creation

**Narration**:
> "Now let's initialize our demo project. Watch how this creates the connection between our local codebase and the 200notes project management system."

**Actions**:
```bash
# Initialize project
200notes init "PDF Export & Stripe v0.3.0"
# Choose: "Create new project"
# Description: "Demo project showing Stripe integration with PDF downloads"
```

**Show Results**:
1. `.200notes.json` file created
2. `CLAUDE.md` automatically generated
3. Project appears in 200notes dashboard

**Narration**:
> "Notice what happened - we now have a `.200notes.json` configuration file and a `CLAUDE.md` file that provides context to Claude Code about our project."

---

### **Scene 5: Converting Manual Tasks (3 minutes)**

**Visual**: Terminal commands + dashboard updates

**Narration**:
> "Instead of manual checkboxes, let's create proper, trackable tasks with priorities, tags, and team assignments."

**Actions**:
```bash
# Create tasks from our PROJECT.md checklist
200notes task create "Stripe webhook for payment confirmations" --priority high --tags backend,stripe,webhook

200notes task create "Automatic premium content unlocking" --priority high --tags backend,automation

200notes task create "PDF download rate limiting" --priority medium --tags backend,pdf,security

200notes task create "Email notifications for payments" --priority medium --tags backend,email

200notes task create "Loading states during payment processing" --priority medium --tags frontend,ui

200notes task create "Error handling for failed payments" --priority high --tags frontend,error-handling

# Show current status
200notes status
```

**Visual**: Switch to browser showing dashboard updates in real-time

**Narration**:
> "Look at the difference - instead of static checkboxes, we now have intelligent tasks with priorities, tags, and full tracking. Each change appears instantly in the dashboard."

---

### **Scene 6: The Magic - Automatic Task Tracking (4 minutes)**

**Visual**: Code editor + terminal + dashboard (3-way split)

**Narration**:
> "Here's where the magic happens. When I start Claude Code, it automatically loads our project context from the CLAUDE.md file."

**Actions**:
1. Show current `CLAUDE.md` content:
```bash
cat CLAUDE.md
```

2. Simulate code changes:
```bash
# Simulate working on PaymentController.js
echo "// Adding webhook handling functionality..." >> src/controllers/PaymentController.js

# Show automatic task detection
200notes task start "Stripe webhook for payment confirmations"
```

3. Show updated dashboard - task now "in progress"

**Narration**:
> "The integration automatically detected that I'm working on PaymentController.js and connected it to our Stripe webhook task. No manual updates needed - the system is smart enough to understand the relationship between code and tasks."

**Visual**: Show file-to-task mapping in action

**Actions**:
```bash
# Demonstrate keyword mapping
echo "Key insight: PaymentController.js → 'Stripe', 'webhook', 'payment' tasks"
echo "The system learns your project patterns and automates the boring stuff."
```

---

### **Scene 7: Team Collaboration (1 minute)**

**Visual**: Dashboard with team features

**Narration**:
> "This isn't just for solo developers. The system provides real-time team collaboration with conflict detection and assignment tracking."

**Actions**:
```bash
# Show team features
200notes status --all

# Demonstrate task assignment
200notes task update 1 --assignee "sarah@team.com"
200notes task update 2 --assignee "john@team.com"
```

**Visual**: Show updated dashboard with assignments

**Narration**:
> "Team members can see who's working on what, preventing conflicts and keeping everyone synchronized. No more 'I thought you were handling that' conversations."

---

### **Scene 8: Progress Tracking & Completion (2 minutes)**

**Visual**: Terminal + dashboard updates

**Narration**:
> "Let's complete some tasks and see how progress tracking works in real-time."

**Actions**:
```bash
# Mark tasks as completed
200notes task done "Stripe webhook for payment confirmations"
200notes task done "Automatic premium content unlocking"

# Show updated project status
200notes status

# Show updated CLAUDE.md
cat CLAUDE.md
```

**Visual**: Show dashboard with updated progress bars and statistics

**Narration**:
> "Look at this - real-time progress tracking replaces manual PROJECT.md updates. Stakeholders can see progress instantly, and the team stays aligned on priorities. The CLAUDE.md file is always current with project context."

---

### **Scene 9: Before & After Comparison (1 minute)**

**Visual**: Split screen showing old vs new approach

**Narration**:
> "Let's compare what we had before versus what we have now."

**Before**:
- Static PROJECT.md with manual checkboxes
- Forgotten updates and inconsistent tracking
- No team visibility or real-time collaboration
- No integration with development workflow

**After**:
- Intelligent, automatic task tracking
- Real-time team collaboration and conflict detection
- Seamless Claude Code integration
- Smart file-to-task mapping
- Always up-to-date project context

---

### **Scene 10: Call to Action (30 seconds)**

**Visual**: 200notes website

**Narration**:
> "200notes transforms project management from a manual chore into an intelligent system that works with your development workflow, not against it. Get started today at 200notes.com and experience the future of AI-assisted project management."

**Visual**: Show pricing, key features, and signup CTA

---

## 🎬 Post-Production Notes

### Editing Tips
- Keep transitions smooth between terminal and browser
- Highlight important text with zoom or annotations
- Use consistent branding colors (#06B6D4 for highlights)
- Add subtle background music for energy
- Include captions for accessibility

### Key Moments to Emphasize
1. **"No manual updates needed"** - core value proposition
2. **Real-time dashboard updates** - show the magic happening
3. **Smart file-to-task mapping** - the intelligence behind the system
4. **Team collaboration** - broader appeal beyond solo developers
5. **"Always up-to-date"** - reliability and automation

### Technical Requirements
- Export in 1080p minimum
- Include closed captions
- Provide both short (60s) and long (10-15min) versions
- Create GIF highlights for social media
- Extract key screenshots for documentation

---

## 🎬 Distribution Strategy

### Platforms
- **YouTube**: Full 10-15 minute demo
- **Twitter**: 60-second highlight reel
- **LinkedIn**: Professional audience focus
- **Product Hunt**: Launch announcement
- **Developer Communities**: Reddit, Dev.to, HackerNews

### Messaging Variants
- **For Claude Code Users**: "Supercharge your Claude Code workflow"
- **For Project Managers**: "Finally, project management that works with developers"
- **For Teams**: "Stop chasing developers for project updates"
- **For CTOs**: "Visibility into development progress without overhead"

---

## 🎬 Success Metrics

### Engagement Targets
- **YouTube**: 75% retention rate for first 2 minutes
- **Social Media**: 5% click-through rate to 200notes.com
- **Conversions**: 10% demo-to-signup rate
- **Virality**: 1000+ organic shares within first week

### Follow-up Content
- Developer tutorials for advanced integrations
- Case studies from real users
- Comparison videos with other tools
- Live streaming setup sessions

---

**Ready to record? Let's make project management exciting! 🚀**