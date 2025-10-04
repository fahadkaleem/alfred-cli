# Knowledge Base Building for Alfred CLI

## Intent & Goal

Enhance the `/init` command to automatically analyze codebases and generate comprehensive project documentation using a multi-agent AI architecture. Instead of relying on a single LLM prompt to explore and document a project, we want to spawn multiple specialized AI agents that work in parallel to analyze different aspects of the codebase, then synthesize their findings into rich documentation.

### Current State

The existing `/init` command (packages/cli/src/ui/commands/initCommand.ts:16-93):

- Creates an empty ALFRED.md file
- Submits a single prompt to the main model asking it to analyze the project
- The model explores iteratively (up to 10 files) using tools
- Writes findings to ALFRED.md

**Limitations:**

- Sequential exploration (slow)
- Single perspective analysis (limited depth)
- Manual synthesis required
- Context window constraints

### Desired State

The enhanced `/init` command should:

1. **Prompt user** for what to generate:
   - ALFRED.md only (quick context file)
   - Full knowledge base (comprehensive analysis)
   - Both
2. **Launch specialized agents in parallel** when full knowledge base is selected:
   - Structure Analyzer - code organization, architecture
   - Dependency Analyzer - dependencies, integrations
   - Data Flow Analyzer - state management, data patterns
   - Request Flow Analyzer - HTTP/API request lifecycle
   - API Analyzer - endpoints, interfaces, schemas
3. **Stream progress to UI** - show all agents working simultaneously with their thoughts
4. **Save results** to `.ai/docs/` directory:
   - `structure_analysis.md`
   - `dependency_analysis.md`
   - `data_flow_analysis.md`
   - `request_flow_analysis.md`
   - `api_analysis.md`
5. **Synthesize ALFRED.md** from all analysis results

**Benefits:**

- 5x faster (parallel vs sequential)
- Deeper analysis (specialized agents)
- Better documentation quality
- Reusable knowledge base

---

## Reference: ai-doc-gen Implementation

### How ai-doc-gen Works

The `ai-doc-gen` project (located at `/Users/mohammedfahadkaleem/Documents/Workspace/alfred-cli/examplecode/ai-doc-gen`) uses a multi-agent architecture:

#### Architecture

```
CLI Layer (src/main.py)
    ↓
Handler Layer (src/handlers/analyze.py)
    ↓
Agent Layer (src/agents/analyzer.py)
    ↓
Tool Layer (src/agents/tools/)
```

#### Key Code: Parallel Agent Execution

```python
# src/agents/analyzer.py:53-139
async def run(self):
    tasks = []
    analysis_files = []

    if not self._config.exclude_code_structure:
        analysis_files.append(self._config.repo_path / ".ai" / "docs" / "structure_analysis.md")
        tasks.append(
            self._run_agent(
                agent=self._structure_analyzer_agent,
                user_prompt=self._render_prompt("agents.structure_analyzer.user_prompt"),
                file_path=self._config.repo_path / ".ai" / "docs" / "structure_analysis.md",
            )
        )

    # Similar blocks for dependency, data flow, request flow, API analyzers...

    # Run all agents concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Handle partial success
    self.validate_succession(analysis_files)
```

#### Agent Definition Pattern

Each agent (src/agents/analyzer.py:206-325):

- Has its own **system prompt** defining its specialized role
- Uses **same tools** (FileReadTool, ListFilesTool) but different analysis focus
- Runs **independently** with its own LLM conversation
- Produces **markdown output** saved to `.ai/docs/`

#### Tools Available to Agents

```python
# src/agents/tools/file_tool/file_reader.py
class FileReadTool:
    def _run(self, file_path: str, line_number: int = 0, line_count: int = 200) -> str:
        # Reads files with pagination

# src/agents/tools/dir_tool/list_files.py
class ListFilesTool:
    def _run(self, directory_path: str) -> str:
        # Lists directory contents
```

#### Prompt Structure

```yaml
# src/agents/prompts/analyzer.yaml
agents:
  structure_analyzer:
    system_prompt: |
      You are a Structure Analyzer. Analyze the codebase structure...
      - Identify entry points
      - Map directory organization
      - Document architectural patterns
    user_prompt: |
      Analyze the repository at {{ repo_path }}
```

#### Documentation Synthesis

```python
# src/agents/documenter.py:85-127
async def run(self):
    # Reads all analysis files from .ai/docs/
    available_ai_docs = []
    ai_docs_dir = self._config.repo_path / ".ai" / "docs"
    if ai_docs_dir.exists():
        available_ai_docs = [doc for doc in ai_docs_dir.iterdir() if doc.name.endswith(".md")]

    # Synthesizes into README
    user_prompt = self._render_prompt("agents.documenter.user_prompt")
    await self._run_agent(
        agent=self._documenter_agent,
        user_prompt=user_prompt,
        file_path=self._config.repo_path / "README.md",
    )
```

---

## What Exists in Alfred CLI

### Agent Infrastructure (Already Built!)

Alfred has a **complete agent framework** that's currently unused:

#### 1. Agent Executor (packages/core/src/agents/executor.ts)

- Two-phase execution: Work Phase (tool loop) → Extraction Phase (summary)
- Activity streaming via `SubagentActivityEvent`
- Timeout and max turns protection
- Tool allowlist for safety

```typescript
export class AgentExecutor {
  async run(inputs: AgentInputs, signal: AbortSignal): Promise<OutputObject> {
    // Phase 1: Work Phase - agent calls tools until done
    while (true) {
      const { functionCalls } = await this.callModel(
        chat,
        currentMessages,
        tools,
        signal,
        promptId,
      );
      if (functionCalls.length === 0) break;
      currentMessages = await this.processFunctionCalls(
        functionCalls,
        signal,
        promptId,
      );
    }

    // Phase 2: Extraction Phase - summarize findings
    const { textResponse } = await this.callModel(
      chat,
      extractionMessages,
      [],
      signal,
      extractionPromptId,
    );

    return { result: textResponse, terminate_reason: terminateReason };
  }
}
```

#### 2. Agent Definition Format (packages/core/src/agents/types.ts)

```typescript
export interface AgentDefinition {
  name: string;
  displayName?: string;
  description: string;

  promptConfig: {
    systemPrompt?: string;
    initialMessages?: Content[];
  };

  modelConfig: {
    model: string;
    temp: number;
    top_p: number;
    thinkingBudget?: number;
  };

  runConfig: {
    max_time_minutes: number;
    max_turns?: number;
  };

  toolConfig?: {
    tools: Array<string | FunctionDeclaration | AnyDeclarativeTool>;
  };

  outputConfig?: {
    description: string;
    completion_criteria?: string[];
  };

  inputConfig: {
    inputs: Record<
      string,
      {
        description: string;
        type:
          | 'string'
          | 'number'
          | 'boolean'
          | 'integer'
          | 'string[]'
          | 'number[]';
        required: boolean;
      }
    >;
  };
}
```

#### 3. Example Agent (packages/core/src/agents/codebase-investigator.ts)

```typescript
export const CodebaseInvestigatorAgent: AgentDefinition = {
  name: 'codebase_investigator',
  displayName: 'Codebase Investigator Agent',
  description:
    'Analyzes codebase structure, technologies, dependencies, and conventions',

  inputConfig: {
    inputs: {
      investigation_focus: {
        description:
          'What to investigate (e.g., "authentication implementation")',
        type: 'string',
        required: true,
      },
    },
  },

  outputConfig: {
    description: 'A detailed markdown report summarizing findings',
    completion_criteria: [
      'Must address the investigation_focus',
      'Cite specific files and code snippets',
      'Summarize key technologies and patterns',
    ],
  },

  modelConfig: {
    model: DEFAULT_GEMINI_MODEL,
    temp: 0.2,
    top_p: 1.0,
    thinkingBudget: -1,
  },

  runConfig: {
    max_time_minutes: 5,
    max_turns: 15,
  },

  toolConfig: {
    tools: [LSTool.Name, ReadFileTool.Name, GlobTool.Name, GrepTool.Name],
  },

  promptConfig: {
    systemPrompt: `You are the Codebase Investigator agent.
Your focus: \${investigation_focus}

# Methodology
1. Discovery - look at config files
2. Structure Analysis - use ls/glob to understand layout
3. Deep Dive - read relevant files
4. Synthesis - create markdown report

# Rules
* Use only provided tools
* Cannot modify codebase
* Must be thorough
* Stop calling tools when done`,
  },
};
```

#### 4. Agent Registry (packages/core/src/agents/registry.ts)

```typescript
export class AgentRegistry {
  private readonly agents = new Map<string, AgentDefinition>();

  async initialize(): Promise<void> {
    this.loadBuiltInAgents();
  }

  private loadBuiltInAgents(): void {
    this.registerAgent(CodebaseInvestigatorAgent);
  }

  getDefinition(name: string): AgentDefinition | undefined {
    return this.agents.get(name);
  }

  getAllDefinitions(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }
}
```

#### 5. UI Display (How Agents Appear)

When an agent runs, it displays as a tool call in a bordered box:

```
┌─────────────────────────────────────────────────┐
│ ⟳  structure_analyzer  Analyzing structure...  │
│                                                 │
│    🤖💭 Listing directories...                  │
│    🤖💭 Reading package.json...                │
│    🤖💭 Analyzing import patterns...           │
│                                                 │
│    Agent Finished                              │
│    Result: [markdown report]                   │
└─────────────────────────────────────────────────┘
```

The `SubagentActivityEvent` system (packages/core/src/agents/types.ts:42-47):

```typescript
export interface SubagentActivityEvent {
  isSubagentActivityEvent: true;
  agentName: string;
  type: 'TOOL_CALL_START' | 'TOOL_CALL_END' | 'THOUGHT_CHUNK' | 'ERROR';
  data: Record<string, unknown>;
}
```

Currently only `THOUGHT_CHUNK` is displayed (packages/core/src/agents/invocation.ts:83-92):

```typescript
const onActivity = (activity: SubagentActivityEvent): void => {
  if (!updateOutput) return;

  if (
    activity.type === 'THOUGHT_CHUNK' &&
    typeof activity.data['text'] === 'string'
  ) {
    updateOutput(`🤖💭 ${activity.data['text']}`);
  }
};
```

### What's NOT Connected

The agent system exists but is **completely unused**:

- ❌ AgentRegistry not initialized in Config
- ❌ Agents not exposed anywhere (no tool wrappers, no commands)
- ❌ No way for users to invoke agents
- ❌ CodebaseInvestigatorAgent has never been executed (coverage reports show 0%)

**Git Evidence:**

```bash
commit 794d92a7 - "refactor(agents): Introduce Declarative Agent Framework"
# Added entire agent system but never wired it up
# TODO comment: "Add this test once we actually have a built-in agent configured"
```

---

## Implementation Plan: /init Command Enhancement

### Approach: Direct Agent Invocation (No Tool Exposure)

We will **NOT** expose agents as tools. Instead, the `/init` command will directly invoke `AgentExecutor` to run specialized agents.

### Step 1: Create Agent Definitions

Create 5 specialized documentation agents modeled after ai-doc-gen's analyzers:

#### Structure Analyzer

```typescript
// packages/core/src/agents/structure-analyzer.ts
import type { AgentDefinition } from './types.js';
import { LSTool } from '../tools/ls.js';
import { ReadFileTool } from '../tools/read-file.js';
import { GlobTool } from '../tools/glob.js';
import { GrepTool } from '../tools/grep.js';
import { DEFAULT_GEMINI_MODEL } from '../config/models.js';

export const StructureAnalyzerAgent: AgentDefinition = {
  name: 'structure_analyzer',
  displayName: 'Structure Analyzer',
  description:
    'Analyzes codebase structure, organization, and architectural patterns',

  inputConfig: {
    inputs: {
      repo_path: {
        description: 'Path to the repository to analyze',
        type: 'string',
        required: true,
      },
    },
  },

  outputConfig: {
    description:
      'Detailed markdown analysis of codebase structure and architecture',
    completion_criteria: [
      'Document directory structure and file organization',
      'Identify key entry points and main modules',
      'Describe architectural patterns (monorepo, microservices, MVC, etc.)',
      'List important configuration files',
    ],
  },

  modelConfig: {
    model: DEFAULT_GEMINI_MODEL,
    temp: 0.2,
    top_p: 1.0,
    thinkingBudget: -1,
  },

  runConfig: {
    max_time_minutes: 5,
    max_turns: 20,
  },

  toolConfig: {
    tools: [LSTool.Name, ReadFileTool.Name, GlobTool.Name, GrepTool.Name],
  },

  promptConfig: {
    systemPrompt: `You are a Structure Analyzer agent. Analyze the codebase at \${repo_path}.

# Task
Analyze and document the code structure, organization, and architecture.

# Methodology
1. **Root Exploration**: List root directory, identify package/config files
2. **Entry Point Discovery**: Find main entry points (main.py, index.ts, etc.)
3. **Directory Mapping**: Use ls/glob to understand directory structure
4. **Pattern Recognition**: Identify architectural patterns
5. **Module Analysis**: Document key modules and their purposes

# Output Format (Markdown)
## Directory Structure
[Tree-like structure or description]

## Entry Points
[List main files and their purposes]

## Architectural Pattern
[Monorepo/Microservices/MVC/etc. with explanation]

## Key Modules
[Important directories/packages and what they contain]

## Configuration Files
[Important config files found]

Cite specific files and paths as evidence.`,
  },
};
```

#### Similar agents needed:

- **DependencyAnalyzerAgent** - analyzes package.json, requirements.txt, go.mod, etc.
- **DataFlowAnalyzerAgent** - traces state management, data models, database interactions
- **RequestFlowAnalyzerAgent** - documents HTTP request lifecycle, middleware, routing
- **ApiAnalyzerAgent** - catalogs API endpoints, schemas, interfaces

### Step 2: Register Agents

```typescript
// packages/core/src/agents/registry.ts
import { CodebaseInvestigatorAgent } from './codebase-investigator.js';
import { StructureAnalyzerAgent } from './structure-analyzer.js';
import { DependencyAnalyzerAgent } from './dependency-analyzer.js';
import { DataFlowAnalyzerAgent } from './data-flow-analyzer.js';
import { RequestFlowAnalyzerAgent } from './request-flow-analyzer.js';
import { ApiAnalyzerAgent } from './api-analyzer.js';

private loadBuiltInAgents(): void {
  this.registerAgent(CodebaseInvestigatorAgent);
  this.registerAgent(StructureAnalyzerAgent);
  this.registerAgent(DependencyAnalyzerAgent);
  this.registerAgent(DataFlowAnalyzerAgent);
  this.registerAgent(RequestFlowAnalyzerAgent);
  this.registerAgent(ApiAnalyzerAgent);
}
```

### Step 3: Initialize AgentRegistry in Config

```typescript
// packages/core/src/config/config.ts
import { AgentRegistry } from '../agents/registry.js';

export class Config {
  private agentRegistry!: AgentRegistry;

  async initialize(): Promise<void> {
    // ... existing initialization ...

    this.agentRegistry = new AgentRegistry(this);
    await this.agentRegistry.initialize();

    // Continue with tool registry, etc.
  }

  getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }
}
```

### Step 4: Enhance /init Command

```typescript
// packages/cli/src/ui/commands/initCommand.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  CommandContext,
  SlashCommand,
  SlashCommandActionReturn,
} from './types.js';
import { CommandKind } from './types.js';
import { AgentExecutor } from '@alfred/alfred-cli-core';
import type { AgentDefinition, OutputObject } from '@alfred/alfred-cli-core';

export const initCommand: SlashCommand = {
  name: 'init',
  description: 'Analyzes the project and creates documentation with AI agents',
  kind: CommandKind.BUILT_IN,

  action: async (
    context: CommandContext,
    _args: string,
  ): Promise<SlashCommandActionReturn> => {
    if (!context.services.config) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Configuration not available.',
      };
    }

    const targetDir = context.services.config.getTargetDir();
    const agentRegistry = context.services.config.getAgentRegistry();

    // TODO: Show UI choice dialog for what to generate
    // For now, assume full knowledge base generation

    const docsDir = path.join(targetDir, '.ai', 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    context.ui.addItem(
      {
        type: 'info',
        text: 'Starting multi-agent codebase analysis...',
      },
      Date.now(),
    );

    // Define agents to run
    const agentNames = [
      'structure_analyzer',
      'dependency_analyzer',
      'data_flow_analyzer',
      'request_flow_analyzer',
      'api_analyzer',
    ];

    const outputFiles = [
      'structure_analysis.md',
      'dependency_analysis.md',
      'data_flow_analysis.md',
      'request_flow_analysis.md',
      'api_analysis.md',
    ];

    // Run agents in parallel
    const agentPromises = agentNames.map(async (agentName, index) => {
      const definition = agentRegistry.getDefinition(agentName);
      if (!definition) {
        throw new Error(`Agent ${agentName} not found in registry`);
      }

      // Create executor with activity callback for UI updates
      const executor = await AgentExecutor.create(
        definition,
        context.services.config!,
        (activity) => {
          // Stream agent activity to UI
          let message = '';
          switch (activity.type) {
            case 'THOUGHT_CHUNK':
              message = `🤖💭 ${activity.data['text']}`;
              break;
            case 'TOOL_CALL_START':
              message = `🔧 ${activity.data['name']}`;
              break;
            case 'TOOL_CALL_END':
              message = `✓ ${activity.data['name']} completed`;
              break;
            case 'ERROR':
              message = `❌ ${activity.data['error']}`;
              break;
          }

          if (message) {
            context.ui.addItem(
              {
                type: 'info',
                text: `[${definition.displayName || agentName}] ${message}`,
              },
              Date.now(),
            );
          }
        },
      );

      // Run the agent
      const signal = new AbortController().signal;
      const output = await executor.run({ repo_path: targetDir }, signal);

      // Save result to file
      const outputPath = path.join(docsDir, outputFiles[index]);
      fs.writeFileSync(outputPath, output.result, 'utf8');

      context.ui.addItem(
        {
          type: 'info',
          text: `✓ ${definition.displayName || agentName} completed → ${outputFiles[index]}`,
        },
        Date.now(),
      );

      return output;
    });

    // Wait for all agents to complete
    const results = await Promise.all(agentPromises);

    // Check for failures
    const failures = results.filter((r) => r.terminate_reason !== 'GOAL');
    if (failures.length === results.length) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'All agents failed to complete analysis.',
      };
    } else if (failures.length > 0) {
      context.ui.addItem(
        {
          type: 'warning',
          text: `${failures.length}/${results.length} agents failed. Continuing with partial results.`,
        },
        Date.now(),
      );
    }

    context.ui.addItem(
      {
        type: 'info',
        text: 'All agents completed! Synthesizing ALFRED.md...',
      },
      Date.now(),
    );

    // Now synthesize results into ALFRED.md
    const synthesisPrompt = `Based on the following analysis results, create a comprehensive ALFRED.md file:

${results
  .map(
    (r, i) => `
## ${agentNames[i].replace('_', ' ').toUpperCase()} RESULTS
${r.result}
`,
  )
  .join('\n')}

Create a well-structured ALFRED.md that includes:
1. Project Overview
2. Architecture & Structure
3. Dependencies & Integrations
4. Data Flow & State Management
5. Request/Response Flow
6. API Documentation

Write the ALFRED.md to the current directory.`;

    return {
      type: 'submit_prompt',
      content: synthesisPrompt,
    };
  },
};
```

### Step 5: Agent Prompt Templates

Each agent needs a specialized system prompt. Here are templates based on ai-doc-gen:

#### Dependency Analyzer Prompt

```
You are a Dependency Analyzer. Analyze dependencies at ${repo_path}.

# Task
Document all dependencies, integrations, and external services.

# Methodology
1. Find dependency files (package.json, requirements.txt, go.mod, etc.)
2. Categorize dependencies (runtime, dev, peer, optional)
3. Identify integration points (databases, APIs, services)
4. Document version constraints and compatibility

# Output Format
## Dependencies
### Runtime
[List with versions and purposes]

### Development
[List dev dependencies]

## External Integrations
[APIs, databases, cloud services]

## Version Constraints
[Important version requirements]
```

#### Data Flow Analyzer Prompt

```
You are a Data Flow Analyzer. Trace data flow at ${repo_path}.

# Task
Document how data flows through the application.

# Methodology
1. Identify data models/schemas
2. Trace state management (Redux, Vuex, Context, etc.)
3. Find database interactions
4. Map data transformations

# Output Format
## Data Models
[Core data structures]

## State Management
[Pattern used and implementation]

## Database Layer
[ORM, queries, migrations]

## Data Transformations
[Key transformation points]
```

---

## File Structure After Implementation

```
alfred-cli/
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── agents/
│   │       │   ├── codebase-investigator.ts       (existing)
│   │       │   ├── structure-analyzer.ts          (new)
│   │       │   ├── dependency-analyzer.ts         (new)
│   │       │   ├── data-flow-analyzer.ts          (new)
│   │       │   ├── request-flow-analyzer.ts       (new)
│   │       │   ├── api-analyzer.ts                (new)
│   │       │   ├── registry.ts                    (update)
│   │       │   ├── executor.ts                    (existing)
│   │       │   └── types.ts                       (existing)
│   │       └── config/
│   │           └── config.ts                      (update - add getAgentRegistry)
│   └── cli/
│       └── src/
│           └── ui/
│               └── commands/
│                   └── initCommand.ts             (update - parallel agents)
└── tasks/
    └── knowledge_build.md                         (this file)
```

## Output After Running `/init`

```
.ai/
└── docs/
    ├── structure_analysis.md
    ├── dependency_analysis.md
    ├── data_flow_analysis.md
    ├── request_flow_analysis.md
    └── api_analysis.md

ALFRED.md    (synthesized from all analyses)
```

---

## Next Steps

1. **Create 5 agent definition files** in `packages/core/src/agents/`:
   - structure-analyzer.ts
   - dependency-analyzer.ts
   - data-flow-analyzer.ts
   - request-flow-analyzer.ts
   - api-analyzer.ts

2. **Update AgentRegistry** to register new agents

3. **Add getAgentRegistry() to Config** class

4. **Enhance /init command** with parallel agent execution

5. **Test the flow**:

   ```bash
   npm run build
   npm run bundle
   npm run start
   # Then: /init
   ```

6. **Optional enhancements**:
   - Add UI choice dialog (ALFRED.md only vs full knowledge base)
   - Enhance activity display to show tool calls, not just thoughts
   - Add progress indicators
   - Error recovery and partial success handling

---

## Key Decisions

### Why Not Expose Agents as Tools?

- **Simpler**: Agents only invoked through `/init`, not by main model
- **Controlled**: Prevents accidental agent usage in normal chat
- **Focused**: Keeps agents specifically for documentation tasks

### Why Parallel Execution?

- **5x faster**: All agents run simultaneously
- **Better UX**: User sees progress across all agents
- **Resilient**: Partial success if some agents fail

### Why AgentExecutor Over SubAgentScope?

- **Modern**: AgentExecutor is the new declarative framework
- **Better typed**: Strong TypeScript interfaces
- **More features**: Activity streaming, timeout handling, completion criteria

---

## References

### ai-doc-gen Source Files

- Main analyzer: `examplecode/ai-doc-gen/src/agents/analyzer.py`
- Tools: `examplecode/ai-doc-gen/src/agents/tools/`
- Prompts: `examplecode/ai-doc-gen/src/agents/prompts/analyzer.yaml`
- Handler: `examplecode/ai-doc-gen/src/handlers/analyze.py`

### Alfred Agent Files

- Executor: `packages/core/src/agents/executor.ts`
- Types: `packages/core/src/agents/types.ts`
- Registry: `packages/core/src/agents/registry.ts`
- Example: `packages/core/src/agents/codebase-investigator.ts`
- Invocation: `packages/core/src/agents/invocation.ts`

### UI Components

- History Display: `packages/cli/src/ui/components/HistoryItemDisplay.tsx`
- Tool Message: `packages/cli/src/ui/components/messages/ToolMessage.tsx`
- Tool Group: `packages/cli/src/ui/components/messages/ToolGroupMessage.tsx`
