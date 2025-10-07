# Alfred: AI-Powered Project Planning Assistant

## Vision Statement

Alfred is a conversational CLI tool that serves as an intelligent planning partner for software development teams. Unlike execution-focused AI assistants, Alfred specializes in requirements elicitation, specification creation, and task planning - transforming vague ideas into precisely scoped, context-rich work packages ready for implementation.

## The Problem

Current AI coding assistants excel at implementation but struggle with planning:

1. **Context Fragmentation**: Every new session starts from zero. Developers repeatedly explain project architecture, business logic, and past decisions.

2. **Planning vs Execution Confusion**: Tools try to do both, leading to bloated context windows where planning knowledge competes with implementation details.

3. **Knowledge Loss**: Insights from completed work disappear. Each feature feels like starting over instead of building on accumulated understanding.

4. **Poor Task Scoping**: AI-generated tasks often lack critical context, forcing developers to fill in gaps or waste time on incorrect implementations.

5. **No Institutional Memory**: Teams lose tribal knowledge when team members leave. Decisions, constraints, and "why we did it this way" evaporate.

## The Solution: Alfred

Alfred solves these problems by being a **dedicated planning agent** with persistent memory, focusing exclusively on the "what" and "why" while leaving the "how" to execution tools like Claude Code.

### Core Principles

1. **Planning-Only Focus**: Alfred never writes implementation code. It creates specifications, plans, and tasks.

2. **Conversational Discovery**: Everything happens through dialogue. Alfred asks questions, presents options, and builds understanding collaboratively.

3. **User-Approved Knowledge**: Nothing enters the knowledge base without user review. No hallucinations, no assumptions - only validated information.

4. **Persistent Learning**: Alfred builds institutional knowledge that grows with each feature, making future planning faster and more accurate.

5. **Integration-First**: Alfred syncs with JIRA/Linear, keeping project management tools updated with rich context automatically.

## How Alfred Works

### The User Experience

```
Developer: "I need to add OAuth authentication"

Alfred: I see we have JWT auth. Let me understand your requirements.
        [Analyzes existing codebase]
        [Asks clarifying questions]
        [Builds specification]
        [Creates technical plan]
        [Breaks into tasks]
        [Syncs to JIRA with full context]

Result: 6 tasks in JIRA, each with:
        - Full business context
        - Technical constraints
        - Relevant code references
        - Acceptance criteria
        - Integration points

Developer hands tasks to Claude Code for implementation.
```

### Architecture

Alfred is a TypeScript CLI application built on:

**Core Components:**

- Conversational AI agent powered by Claude/Gemini
- Tool system (read, write, grep, glob, git) for codebase analysis
- Persistent knowledge base (.alfred/ directory)
- Workflow engine for planning processes
- Integration layer for JIRA/Linear

**Tool Access:**
Alfred has the same file/codebase tools as execution assistants, but uses them differently:

- **Read files** → Understand existing patterns, not copy code
- **Grep/Glob** → Find relevant context, not locate bugs
- **Git operations** → Analyze history and decisions, not create commits
- **Write files** → Create specs/plans/tasks, not implementation

### The Knowledge Base

Alfred maintains a growing knowledge base at `.alfred/`:

```
.alfred/
├── constitution.md          # Project principles & constraints
├── knowledge/
│   ├── domain.md           # Business context & entities
│   ├── architecture.md     # System design & patterns
│   ├── decisions/          # ADRs (why we chose X)
│   └── integrations.md     # External systems & APIs
├── specs/                  # Feature specifications
│   └── 001-oauth-auth/
│       ├── spec.md         # What & why
│       ├── plan.md         # Technical approach
│       └── research.md     # Investigation findings
└── tasks/                  # Execution-ready tasks
    ├── 001-oauth-setup.md
    └── 002-google-provider.md
```

**Knowledge grows through:**

1. Initial codebase analysis (like `/init` but planning-focused)
2. User conversations (validated before saving)
3. Completed work analysis (extracting patterns and decisions)

### Workflow System

Alfred uses on-demand workflow instructions via the `getWorkflowInstructions` tool:

**Available Workflows:**

- `constitution` - Establish project principles
- `elicitation` - Extract requirements through questioning
- `specification` - Create functional specs
- `planning` - Develop technical plans
- `task-breakdown` - Generate execution-ready tasks
- `knowledge-update` - Learn from completed work

Alfred autonomously loads the appropriate workflow based on user intent:

```
User: "Let's plan OAuth"

Alfred: [Loads elicitation workflow]
        [Asks clarifying questions]
        [Transitions to specification workflow]
        [Loads planning workflow]
        [Loads task-breakdown workflow]

All seamless - user just has a conversation.
```

### SDLC Integration

Alfred follows Software Development Life Cycle phases, but as a planning agent:

**Phase 1: Requirements**

- Conversational elicitation
- Business context gathering
- User story creation
- Acceptance criteria definition

**Phase 2: Specification**

- Functional requirements documentation
- Domain entity identification
- Edge case discovery
- Constraint capture

**Phase 3: Planning**

- Technical approach design
- Technology selection (with rationale)
- Architecture alignment
- Integration point identification

**Phase 4: Task Breakdown**

- Granular task creation
- Context enrichment for each task
- Dependency identification
- Acceptance criteria mapping

**Phase 5: Execution Handoff**

- Sync to JIRA/Linear
- Provide to execution tools (Claude Code)
- Monitor completion
- Extract learnings

**Phase 6: Knowledge Capture**

- Analyze completed work
- Update patterns and conventions
- Record decisions and rationale
- Enrich future task context

## Key Differentiators

### vs Claude Code / Cursor / Windsurf

**Them**: Execution-focused, ephemeral context, write code
**Alfred**: Planning-focused, persistent knowledge, write specs/tasks

### vs GitHub Copilot

**Them**: Code completion and generation
**Alfred**: Requirements to tasks transformation

### vs Spec-Kit

**Them**: Template-based autonomous generation
**Alfred**: Conversational collaborative planning with validation

### vs BMAD

**Them**: Complex agent personas, execution + planning, workflow ceremony
**Alfred**: Single planning agent, clean separation, natural conversation

## Integration Architecture

### JIRA/Linear Integration

Alfred keeps project management tools synchronized:

**On Task Creation:**

```
Alfred creates task → Syncs to JIRA with:
- Title & description
- Full technical context
- Acceptance criteria
- Code references
- Dependencies
- Estimates (optional)
```

**On Task Completion:**

```
Developer marks done in JIRA → Alfred:
- Analyzes what was built
- Extracts patterns/decisions
- Updates knowledge base
- Enriches remaining tasks
- Suggests related work
```

**Bidirectional Sync:**

- Changes in JIRA → Alfred awareness
- Alfred updates → JIRA reflection
- Comments/status → Mutual visibility

### Claude Code Integration

Alfred and Claude Code work as complementary tools:

```
Alfred (Planning)              Claude Code (Execution)
├─ Elicit requirements    →    ├─ Read task context
├─ Create spec            →    ├─ Implement code
├─ Plan approach          →    ├─ Write tests
├─ Generate tasks         →    ├─ Run builds
└─ Provide rich context   →    └─ Create commits

        ↓                              ↓

Alfred analyzes commits  ←    Claude Code completes task
Alfred updates knowledge
Alfred enriches next tasks
```

## Technical Implementation

### Mode-Less Architecture

Alfred doesn't use explicit modes. Instead, it uses the `getWorkflowInstructions` tool to load specialized instructions on-demand:

```typescript
// Alfred's base system prompt
You are Alfred, a project planning assistant.
You have access to getWorkflowInstructions(workflow, section?)
When user needs requirements → load 'elicitation'
When creating specs → load 'specification'
When technical planning → load 'planning'
```

**Benefits:**

- User experiences natural conversation
- Context efficiency (only load what's needed)
- Alfred decides when it needs specialized guidance
- No mental overhead for users

### Workflow Instructions

Located in `packages/core/src/workflows/`:

```
elicitation/instructions.md    - How to extract requirements
specification/instructions.md  - How to create specs
planning/instructions.md       - How to create plans
task-breakdown/instructions.md - How to generate tasks
knowledge-update/instructions.md - How to learn from work
```

Each contains:

- Goal and purpose
- Step-by-step workflow
- Tools to use
- Output format
- Quality criteria
- Transition conditions

### Knowledge Management Tools

Alfred's planning tools (not execution tools):

```typescript
// Constitution & Principles
createConstitution(principles: string[]): void
updateConstitution(section: string, content: string): void

// Knowledge Base
updateKnowledge(category: string, content: Knowledge): void
searchKnowledge(query: string): Knowledge[]
createDecision(decision: ADR): void

// Specifications
createSpec(name: string, requirements: Requirements): SpecFile
updateSpec(specId: string, section: string, content: string): void

// Planning
createPlan(specId: string, approach: TechApproach): PlanFile
researchTech(query: string): ResearchResults

// Task Management
createTask(planId: string, description: string, context: Context): TaskFile
enrichTask(taskId: string, learnings: Learnings): void
syncToJira(task: Task): JiraIssue

// Learning
extractFromCommit(sha: string): Learnings
analyzePatterns(files: string[]): Patterns
updateArchitectureKnowledge(insights: Insights): void
```

## The Alfred Workflow in Practice

### First Time: Project Onboarding

```
1. User starts Alfred in project
2. Alfred: "Let me understand your project"
3. Asks about:
   - Business domain & purpose
   - Users & their needs
   - Current architecture
   - Tech stack & constraints
   - Team structure
4. Analyzes codebase for validation
5. Creates constitution (user approves)
6. Builds knowledge base (user reviews)
7. Ready for planning
```

### Regular Use: Planning New Feature

```
1. User: "We need to add payment processing"

2. Alfred [Elicitation]:
   - "Which payment providers?"
   - "One-time or subscriptions?"
   - "How does this fit existing checkout?"
   - "What about refunds?"

3. Alfred [Specification]:
   - Creates spec.md
   - Shows to user
   - User approves/edits

4. Alfred [Planning]:
   - "I see we use Express + Postgres"
   - "Recommend Stripe SDK because..."
   - Creates plan.md
   - User approves

5. Alfred [Task Breakdown]:
   - Generates 8 tasks
   - Each with full context
   - Shows user

6. Alfred [Integration]:
   - Creates JIRA tickets
   - Links dependencies
   - Adds all context

7. Developer implements in Claude Code

8. Alfred [Learning]:
   - Analyzes completed work
   - "I see we created PaymentService pattern"
   - "Should I add this to knowledge base?"
   - User approves
   - Future tasks benefit from this pattern
```

### After Work: Continuous Learning

```
1. Task marked complete in JIRA
2. Alfred analyzes git commits
3. Extracts:
   - New interfaces created
   - Patterns used
   - Decisions made
   - Files to reference
4. Proposes knowledge updates
5. User reviews & approves
6. Updates remaining tasks with new context
7. Knowledge base grows
```

## Success Criteria

Alfred succeeds when:

1. **Second feature is easier than first** - Knowledge accumulation shows value
2. **Tasks need minimal clarification** - Rich context reduces back-and-forth
3. **New team members onboard faster** - Knowledge base captures tribal knowledge
4. **Planning quality improves** - Learns what works, what doesn't
5. **Execution tools get better input** - Claude Code implements efficiently with full context

## Roadmap

**Phase 1: Foundation**

- Core CLI and conversation loop
- Basic knowledge base
- Workflow engine
- File tools integration

**Phase 2: Planning Workflows**

- Elicitation system
- Specification creation
- Technical planning
- Task breakdown

**Phase 3: Integration**

- JIRA/Linear sync
- Claude Code handoff
- Knowledge update from commits

**Phase 4: Intelligence**

- Pattern recognition
- Decision tracking (ADRs)
- Architectural insights
- Proactive suggestions

**Phase 5: Team Features**

- Multi-user knowledge sharing
- Team-wide decision visibility
- Cross-project pattern library
- Planning analytics

## Why Alfred Will Succeed

1. **Clear Separation**: Planning ≠ Execution. Alfred owns one, does it exceptionally.

2. **Persistent Memory**: Unlike session-based tools, Alfred remembers everything (with user validation).

3. **User Control**: Every piece of knowledge approved. No surprise hallucinations.

4. **Integration**: Works with existing workflows (JIRA) and tools (Claude Code).

5. **Learning Over Time**: Gets smarter with each feature, unlike stateless tools.

6. **Human-Centric**: Alfred assists human decision-making, never replaces it.

---

Alfred transforms planning from a repetitive chore into a collaborative dialogue with an increasingly intelligent partner that learns your project, remembers your decisions, and helps you think through complexity.
