# Creating New Tools in Alfred

This playbook provides complete guidance for creating new tools in the Alfred CLI tool system. Tools extend Alfred's capabilities by providing AI agents with specific actions they can perform (read files, search content, execute commands, etc.).

## Tool System Organization

### Directory Structure

```
packages/core/src/tools/
├── tools.ts                    # Base classes, interfaces, and types
├── tool-registry.ts            # Tool registration and management
├── tool-error.ts              # Error types for tools
├── [tool-name].ts             # Individual tool implementation
├── [tool-name].test.ts        # Tool tests
└── [other tool files...]
```

### Tool Integration Points

**Registration**: `packages/core/src/config/config.ts:1040-1109`

- All tools are registered in the `Config.createToolRegistry()` method
- Uses a `registerCoreTool()` helper function for conditional registration

**Imports**: `packages/core/src/config/config.ts:19-31,54,70`

- Tool classes are imported at the top of config.ts
- Each tool must be imported before registration

## Tool Categories

### 1. **File System Tools** (`packages/core/src/tools/`)

Tools for file operations:

- **ReadFileTool**: `read-file.ts` - Reads file contents (text, images, PDFs)
  - When to use: Reading single files with optional pagination
- **WriteFileTool**: `write-file.ts` - Writes or overwrites files
  - When to use: Creating or modifying files
- **EditTool**: `edit.ts` - Applies targeted edits to files
  - When to use: Making specific changes without rewriting entire files
- **ReadManyFilesTool**: `read-many-files.ts` - Reads multiple files at once
  - When to use: Batch file reading operations

### 2. **Search Tools** (`packages/core/src/tools/`)

Tools for finding information:

- **GrepTool**: `grep.ts` - Searches file contents using regex
  - When to use: Pattern matching across files
- **RipGrepTool**: `ripGrep.ts` - Fast regex search using ripgrep
  - When to use: Same as GrepTool but faster (if ripgrep available)
- **GlobTool**: `glob.ts` - Finds files by name patterns
  - When to use: Locating files by glob patterns

### 3. **Command Execution Tools** (`packages/core/src/tools/`)

Tools for running commands:

- **ShellTool**: `shell.ts` - Executes shell commands
  - When to use: Running terminal commands
- **LSTool**: `ls.ts` - Lists directory contents
  - When to use: Exploring directory structure

### 4. **External Integration Tools** (`packages/core/src/tools/`)

Tools for external data:

- **WebFetchTool**: `web-fetch.ts` - Fetches and processes web content
  - When to use: Retrieving information from URLs
- **WebSearchTool**: `web-search.ts` - Performs web searches
  - When to use: Finding information online

### 5. **State Management Tools** (`packages/core/src/tools/`)

Tools for maintaining state:

- **MemoryTool**: `memoryTool.ts` - Manages persistent project knowledge
  - When to use: Storing/retrieving project context
- **WriteTodosTool**: `write-todos.ts` - Manages task lists
  - When to use: Tracking multi-step tasks

### 6. **MCP Tools** (`packages/core/src/tools/`)

Dynamically discovered tools:

- **DiscoveredMCPTool**: `mcp-tool.ts` - Tools from MCP servers
  - When to use: Extending Alfred with external tools
- **DiscoveredTool**: `tool-registry.ts:123-167` - Tools from discovery commands
  - When to use: Project-specific tools

## How Tools Are Written

### Standard Tool Pattern

```typescript
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { Config } from '../config/config.js';

// 1. Define parameter interface
export interface MyToolParams {
  /**
   * Required parameter description
   */
  required_param: string;

  /**
   * Optional parameter description
   */
  optional_param?: number;
}

// 2. Create invocation class (execution logic)
class MyToolInvocation extends BaseToolInvocation<MyToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: MyToolParams,
  ) {
    super(params);
  }

  getDescription(): string {
    // Return a short, user-friendly description of what this invocation will do
    return `Process ${this.params.required_param}`;
  }

  toolLocations(): ToolLocation[] {
    // Return file paths affected by this tool (for UI display)
    // Return empty array if tool doesn't affect files
    return [];
  }

  override async shouldConfirmExecute(
    signal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    // For non-mutating tools (Read, Search, Fetch), return false to auto-approve
    // For mutating tools (Edit, Delete, Move, Execute), return confirmation details
    return false; // Auto-approve for this example
  }

  async execute(
    signal: AbortSignal,
    updateOutput?: (output: string) => void,
  ): Promise<ToolResult> {
    // Implement the tool's core logic here
    try {
      // Your implementation
      const result = `Processed: ${this.params.required_param}`;

      return {
        llmContent: result, // Content for LLM history
        returnDisplay: result, // Display for user
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error: ${errorMessage}`,
        returnDisplay: errorMessage,
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }
  }
}

// 3. Create tool class (validation and schema)
export class MyTool extends BaseDeclarativeTool<MyToolParams, ToolResult> {
  static readonly Name: string = 'my_tool';

  constructor(private readonly config: Config) {
    super(
      MyTool.Name, // name (API identifier)
      'MyTool', // displayName (user-facing)
      'Description of what this tool does. Include details about parameters and behavior.',
      Kind.Other, // kind (categorization - see Kind enum)
      {
        // JSON schema for parameters
        type: 'object',
        properties: {
          required_param: {
            type: 'string',
            description: 'Description for LLM to understand this parameter',
          },
          optional_param: {
            type: 'number',
            description: 'Optional parameter description',
          },
        },
        required: ['required_param'],
      },
      true, // isOutputMarkdown (default: true)
      false, // canUpdateOutput (streaming support, default: false)
    );
  }

  protected override validateToolParamValues(
    params: MyToolParams,
  ): string | null {
    // Add custom validation logic beyond JSON schema
    if (params.required_param.trim() === '') {
      return 'required_param must be non-empty';
    }

    if (params.optional_param !== undefined && params.optional_param < 0) {
      return 'optional_param must be non-negative';
    }

    return null; // Validation passed
  }

  protected createInvocation(
    params: MyToolParams,
  ): ToolInvocation<MyToolParams, ToolResult> {
    return new MyToolInvocation(this.config, params);
  }
}
```

### Key Conventions

#### 1. File Naming and Structure

- **File name**: Use kebab-case: `my-tool.ts`
- **Class names**: Use PascalCase: `MyTool`, `MyToolInvocation`, `MyToolParams`
- **Static name**: Use snake_case: `my_tool` (this is the API identifier)
- **Location**: Place in `packages/core/src/tools/`

**Example:**

```typescript
// File: packages/core/src/tools/my-tool.ts
export interface MyToolParams {
  /* ... */
}
class MyToolInvocation extends BaseToolInvocation<MyToolParams, ToolResult> {
  /* ... */
}
export class MyTool extends BaseDeclarativeTool<MyToolParams, ToolResult> {
  static readonly Name: string = 'my_tool';
  // ...
}
```

#### 2. Parameter Validation

**JSON Schema Validation**: Automatically enforced by `BaseDeclarativeTool`
**Custom Validation**: Override `validateToolParamValues()` for business logic

```typescript
protected override validateToolParamValues(params: MyToolParams): string | null {
  // Return error message string if invalid, null if valid
  if (someCondition) {
    return 'Descriptive error message';
  }
  return null;
}
```

#### 3. Tool Kind Categorization

Use the `Kind` enum from `packages/core/src/tools/tools.ts:654-664`:

```typescript
export enum Kind {
  Read = 'read', // Reading data (files, web, etc.)
  Edit = 'edit', // Modifying existing content
  Delete = 'delete', // Removing content
  Move = 'move', // Moving/renaming
  Search = 'search', // Finding information
  Execute = 'execute', // Running commands
  Think = 'think', // Reasoning/planning
  Fetch = 'fetch', // Retrieving external data
  Other = 'other', // Miscellaneous
}
```

**Mutator kinds** (have side effects): `Edit`, `Delete`, `Move`, `Execute`

#### 4. Error Handling

Use `ToolErrorType` from `packages/core/src/tools/tool-error.ts`:

```typescript
import { ToolErrorType } from './tool-error.js';

return {
  llmContent: 'Error message for LLM',
  returnDisplay: 'User-friendly error',
  error: {
    message: errorMessage,
    type: ToolErrorType.FILE_NOT_FOUND, // or other appropriate type
  },
};
```

**Common error types**: `FILE_NOT_FOUND`, `EXECUTION_FAILED`, `INVALID_TOOL_PARAMS`, `TARGET_IS_DIRECTORY`, `FILE_TOO_LARGE`

#### 5. Tool Locations

Override `toolLocations()` to return file paths affected by the tool:

```typescript
toolLocations(): ToolLocation[] {
  // For file-reading tools
  return [{
    path: this.params.absolute_path,
    line: this.params.offset // Optional line number
  }];

  // For tools that don't affect files
  return [];
}
```

This is used by the UI to display affected file locations in tool messages.

#### 6. User Confirmation for Mutating Tools

**Critical**: Tools with side effects (Edit, Delete, Move, Execute kinds) MUST implement confirmation logic.

Override `shouldConfirmExecute()` to request user approval:

```typescript
override async shouldConfirmExecute(
  signal: AbortSignal,
): Promise<ToolCallConfirmationDetails | false> {
  // Return false to auto-approve (for Read/Search/Fetch tools)
  if (this.kind === Kind.Read) {
    return false;
  }

  // For mutating tools, check allowlist first
  if (this.isInAllowlist()) {
    return false;
  }

  // Return confirmation details to prompt user
  return {
    type: 'edit', // or 'exec' or 'mcp'
    title: 'Confirm Action',
    // ... details specific to confirmation type
    onConfirm: async (outcome) => {
      // Handle approval outcome
      if (outcome === ToolConfirmationOutcome.ProceedAlways) {
        this.addToAllowlist();
      }
    }
  };
}
```

**Confirmation Types** (from `packages/core/src/core/coreToolScheduler.ts:592-643`):

1. **Edit Confirmation** (`type: 'edit'`):

```typescript
{
  type: 'edit',
  title: string,
  fileName: string,
  filePath: string,
  fileDiff: string,              // Unified diff
  originalContent: string | null,
  newContent: string,
  onConfirm: (outcome, payload?) => Promise<void>
}
```

2. **Execute Confirmation** (`type: 'exec'`):

```typescript
{
  type: 'exec',
  title: string,
  command: string,
  rootCommand: string,           // Base command for allowlisting
  onConfirm: (outcome) => Promise<void>
}
```

3. **MCP Tool Confirmation** (`type: 'mcp'`):

```typescript
{
  type: 'mcp',
  title: string,
  serverName: string,
  toolName: string,
  onConfirm: (outcome) => Promise<void>
}
```

**Confirmation Outcomes** (`packages/core/src/core/coreToolScheduler.ts:645-652`):

```typescript
enum ToolConfirmationOutcome {
  ProceedOnce, // Execute this time only
  ProceedAlways, // Auto-approve all future similar calls
  ProceedAlwaysServer, // MCP: Approve all tools from this server
  ProceedAlwaysTool, // MCP: Approve only this specific tool
  ModifyWithEditor, // (IDE integration removed)
  Cancel, // Deny execution
}
```

#### 7. Dependencies and Config

Tools typically receive a `Config` instance:

```typescript
constructor(private readonly config: Config) {
  super(/* ... */);
}
```

**Common config methods**:

- `config.getTargetDir()` - Project root directory
- `config.getWorkspaceContext()` - Workspace boundaries
- `config.getFileSystemService()` - File operations
- `config.getFileService()` - File discovery
- `config.getFileExclusions()` - Ignore patterns

## Adding a New Tool: Step-by-Step

### Step 1: Create the Tool File

**Decision tree:**

- File system operations → `packages/core/src/tools/[tool-name].ts`
- Search/discovery → `packages/core/src/tools/[tool-name].ts`
- External integration → `packages/core/src/tools/[tool-name].ts`

All tools go in the same directory.

### Step 2: Implement the Tool

**File**: `packages/core/src/tools/my-tool.ts`

```typescript
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { Config } from '../config/config.js';
import { ToolErrorType } from './tool-error.js';

export interface MyToolParams {
  input: string;
}

class MyToolInvocation extends BaseToolInvocation<MyToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: MyToolParams,
  ) {
    super(params);
  }

  getDescription(): string {
    return `Processing ${this.params.input}`;
  }

  toolLocations(): ToolLocation[] {
    // Return affected file paths (empty if none)
    return [];
  }

  override async shouldConfirmExecute(
    signal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    // Auto-approve for non-mutating tools
    return false;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    // Implementation
    return {
      llmContent: 'Success',
      returnDisplay: 'Success',
    };
  }
}

export class MyTool extends BaseDeclarativeTool<MyToolParams, ToolResult> {
  static readonly Name: string = 'my_tool';

  constructor(private readonly config: Config) {
    super(MyTool.Name, 'MyTool', 'Tool description', Kind.Other, {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Input parameter' },
      },
      required: ['input'],
    });
  }

  protected validateToolParamValues(params: MyToolParams): string | null {
    return null;
  }

  protected createInvocation(
    params: MyToolParams,
  ): ToolInvocation<MyToolParams, ToolResult> {
    return new MyToolInvocation(this.config, params);
  }
}
```

### Step 3: Create Tool Tests

**File**: `packages/core/src/tools/my-tool.test.ts`

```typescript
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MyToolParams } from './my-tool.js';
import { MyTool } from './my-tool.js';
import type { Config } from '../config/config.js';
import type { ToolInvocation, ToolResult } from './tools.js';

describe('MyTool', () => {
  let tool: MyTool;
  let mockConfig: Config;
  const abortSignal = new AbortController().signal;

  beforeEach(() => {
    mockConfig = {
      // Mock necessary config methods
      getTargetDir: () => '/test/dir',
    } as unknown as Config;

    tool = new MyTool(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('build', () => {
    it('should return an invocation for valid params', () => {
      const params: MyToolParams = { input: 'test' };
      const result = tool.build(params);
      expect(typeof result).not.toBe('string');
    });

    it('should throw error for invalid params', () => {
      const params: MyToolParams = { input: '' };
      expect(() => tool.build(params)).toThrow();
    });
  });

  describe('getDescription', () => {
    it('should return correct description', () => {
      const params: MyToolParams = { input: 'test' };
      const invocation = tool.build(params) as ToolInvocation<
        MyToolParams,
        ToolResult
      >;
      expect(invocation.getDescription()).toBe('Processing test');
    });
  });

  describe('toolLocations', () => {
    it('should return affected file locations', () => {
      const params: MyToolParams = { input: 'test' };
      const invocation = tool.build(params) as ToolInvocation<
        MyToolParams,
        ToolResult
      >;
      const locations = invocation.toolLocations();
      expect(Array.isArray(locations)).toBe(true);
    });
  });

  describe('shouldConfirmExecute', () => {
    it('should auto-approve non-mutating tools', async () => {
      const params: MyToolParams = { input: 'test' };
      const invocation = tool.build(params) as ToolInvocation<
        MyToolParams,
        ToolResult
      >;
      const result = await invocation.shouldConfirmExecute(abortSignal);
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute successfully', async () => {
      const params: MyToolParams = { input: 'test' };
      const invocation = tool.build(params) as ToolInvocation<
        MyToolParams,
        ToolResult
      >;

      const result = await invocation.execute(abortSignal);
      expect(result.llmContent).toBe('Success');
      expect(result.returnDisplay).toBe('Success');
      expect(result.error).toBeUndefined();
    });

    it('should handle errors', async () => {
      const params: MyToolParams = { input: 'error' };
      const invocation = tool.build(params) as ToolInvocation<
        MyToolParams,
        ToolResult
      >;

      const result = await invocation.execute(abortSignal);
      expect(result.error).toBeDefined();
    });
  });
});
```

### Step 4: Register the Tool

**In file**: `packages/core/src/config/config.ts`

**a) Add import at top** (around line 19-31):

```typescript
import { MyTool } from '../tools/my-tool.js';
```

**b) Register in createToolRegistry()** (around line 1074-1105):

```typescript
async createToolRegistry(): Promise<ToolRegistry> {
  const registry = new ToolRegistry(this, this.eventEmitter);

  const registerCoreTool = <T extends AnyDeclarativeTool>(
    ToolClass: new (...args: unknown[]) => T,
    ...args: unknown[]
  ) => {
    // ... existing logic ...
  };

  registerCoreTool(LSTool, this);
  registerCoreTool(ReadFileTool, this);
  // ... existing tools ...
  registerCoreTool(MyTool, this);  // Add your tool here

  await registry.discoverAllTools();
  return registry;
}
```

### Step 5: Enable/Disable Tool (Optional)

If the tool should be conditionally enabled:

**a) Add setting to settings schema** (`packages/core/src/config/settingsSchema.ts`):

```typescript
useMyTool: {
  type: 'boolean',
  description: 'Enable MyTool functionality',
  default: true,
},
```

**b) Add getter to Config class** (`packages/core/src/config/config.ts`):

```typescript
getUseMyTool(): boolean {
  return this.settings.get('useMyTool') ?? true;
}
```

**c) Conditionally register** (in `createToolRegistry()`):

```typescript
if (this.getUseMyTool()) {
  registerCoreTool(MyTool, this);
}
```

## How Tools Hook Into the App

### Tool Execution Hierarchy

```
Config (config.ts)
└── createToolRegistry()
    └── ToolRegistry (tool-registry.ts)
        ├── registerTool() - Adds tool to registry
        ├── getFunctionDeclarations() - Returns schemas for LLM
        └── getTool() - Retrieves tool by name

LLM generates tool call (FunctionCall with name + args)
└── CoreToolScheduler.schedule([ToolCallRequestInfo...])
    └── For each request:
        ├── ToolRegistry.getTool(name).build(params)
        │   ├── validateToolParams() - JSON schema validation
        │   ├── validateToolParamValues() - Custom validation
        │   └── createInvocation() → ToolInvocation
        │
        ├── ToolInvocation.shouldConfirmExecute()
        │   ├── Returns false → Auto-approve (ScheduledToolCall)
        │   └── Returns ToolCallConfirmationDetails → WaitingToolCall
        │       └── User approves → ScheduledToolCall
        │
        └── ToolInvocation.execute()
            ├── Streams output via updateOutput() if canUpdateOutput=true
            └── Returns ToolResult → SuccessfulToolCall or ErroredToolCall
```

### Tool Call Lifecycle (CoreToolScheduler)

**Location**: `packages/core/src/core/coreToolScheduler.ts:39-116`

Tools pass through these states during execution:

1. **ValidatingToolCall**: Building invocation, checking confirmation needs
2. **WaitingToolCall**: Awaiting user approval (for mutating tools)
3. **ScheduledToolCall**: Approved, waiting to execute
4. **ExecutingToolCall**: Currently running
5. **SuccessfulToolCall**: Completed successfully
6. **ErroredToolCall**: Failed with error
7. **CancelledToolCall**: User cancelled or aborted

**Key Scheduler Behaviors**:

- Validates and confirms tools before execution
- Manages parallel execution of multiple tools
- Handles streaming output for long-running tools
- Converts results to `FunctionResponse` parts for LLM
- Logs telemetry for all tool operations

### Integration Points

#### 1. Via Tool Registry Registration

**File**: `packages/core/src/config/config.ts:1040-1109`

Tools are registered in the `Config.createToolRegistry()` method using the `registerCoreTool()` helper:

```typescript
const registerCoreTool = <T extends AnyDeclarativeTool>(
  ToolClass: new (...args: unknown[]) => T,
  ...args: unknown[]
) => {
  // Checks if tool is enabled
  // Passes Config and optional MessageBus
  // Calls registry.registerTool(new ToolClass(...))
};
```

**Example addition:**

```typescript
registerCoreTool(MyTool, this);
```

**Existing tools managed here:**

- `LSTool` → List directory contents
- `ReadFileTool` → Read files
- `GrepTool` or `RipGrepTool` → Search file contents (conditional)
- `GlobTool` → Find files by pattern
- `EditTool` → Edit files
- `WriteFileTool` → Write files
- `WebFetchTool` → Fetch web content
- `ReadManyFilesTool` → Read multiple files
- `ShellTool` → Execute shell commands
- `MemoryTool` → Manage project memory
- `WebSearchTool` → Search the web
- `WriteTodosTool` → Manage task lists (conditional)

#### 2. Via MCP Server Discovery

**File**: `packages/core/src/tools/mcp-client.ts:163`

MCP tools are dynamically registered:

```typescript
for (const tool of tools) {
  this.toolRegistry.registerTool(tool);
}
```

#### 3. Via Discovery Commands

**File**: `packages/core/src/tools/tool-registry.ts:294-412`

Project-specific tools can be discovered from shell commands:

```typescript
private async discoverAndRegisterToolsFromCommand(): Promise<void> {
  const discoveryCmd = this.config.getToolDiscoveryCommand();
  // Executes command, parses JSON output
  // Registers DiscoveredTool instances
}
```

## State Management

Tools don't use global state management. Instead:

### Config Access

Tools access configuration through the `Config` instance:

```typescript
class MyToolInvocation extends BaseToolInvocation<MyToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: MyToolParams,
  ) {
    super(params);
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const targetDir = this.config.getTargetDir();
    const workspace = this.config.getWorkspaceContext();
    // Use config to access services and settings
  }
}
```

**Available config methods:**

#### Filesystem

- `getTargetDir(): string` - Project root directory
- `getWorkspaceContext(): WorkspaceContext` - Workspace boundaries
- `getFileSystemService(): FileSystemService` - File operations
- `getFileService(): FileDiscoveryService` - File discovery

Full interface at `packages/core/src/config/config.ts:117-200`

### MessageBus (Optional)

Tools can optionally receive a MessageBus for communication:

```typescript
export class MyTool extends BaseDeclarativeTool<MyToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    messageBus?: MessageBus,
  ) {
    super(
      MyTool.Name,
      'MyTool',
      'Description',
      Kind.Other,
      parameterSchema,
      true, // isOutputMarkdown
      false, // canUpdateOutput
      messageBus, // Pass to base class
    );
  }
}
```

The MessageBus is automatically provided when `enableMessageBusIntegration` setting is enabled.

## Testing Patterns

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MyToolParams } from './my-tool.js';
import { MyTool } from './my-tool.js';
import type { Config } from '../config/config.js';
import type { ToolInvocation, ToolResult } from './tools.js';

describe('MyTool', () => {
  let tool: MyTool;
  let mockConfig: Config;
  const abortSignal = new AbortController().signal;

  beforeEach(() => {
    // Setup mocks
    mockConfig = {
      getTargetDir: () => '/test/dir',
      getWorkspaceContext: () => createMockWorkspaceContext('/test/dir'),
    } as unknown as Config;

    tool = new MyTool(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('build', () => {
    // Test parameter validation
  });

  describe('getDescription', () => {
    // Test description generation
  });

  describe('execute', () => {
    // Test execution logic
  });
});
```

### Testing Tools

**From Vitest**:

- `describe()` - Group tests
- `it()` - Individual test case
- `expect()` - Assertions
- `beforeEach()` - Setup before each test
- `afterEach()` - Cleanup after each test
- `vi.fn()` - Create mock function
- `vi.mock()` - Mock module
- `vi.restoreAllMocks()` - Restore all mocks

**Project utilities**:

- `createMockWorkspaceContext()` - From `packages/core/src/test-utils/mockWorkspaceContext.js`

### Mocking Config

```typescript
const mockConfig = {
  getTargetDir: () => '/test/dir',
  getWorkspaceContext: () => createMockWorkspaceContext('/test/dir'),
  getFileSystemService: () => new StandardFileSystemService(),
  getFileService: () => new FileDiscoveryService('/test/dir'),
  storage: {
    getProjectTempDir: () => '/test/dir/.temp',
  },
} as unknown as Config;
```

### Testing Examples from Codebase

**Validation testing** (`packages/core/src/tools/read-file.test.ts:64-71`):

```typescript
it('should throw error if file path is relative', () => {
  const params: ReadFileToolParams = {
    absolute_path: 'relative/path.txt',
  };
  expect(() => tool.build(params)).toThrow(
    'File path must be absolute, but was relative: relative/path.txt. You must provide an absolute path.',
  );
});
```

**Execution testing** (`packages/core/src/tools/grep.test.ts:129-144`):

```typescript
it('should find matches for a simple pattern in all files', async () => {
  const params: GrepToolParams = { pattern: 'world' };
  const invocation = grepTool.build(params);
  const result = await invocation.execute(abortSignal);
  expect(result.llmContent).toContain(
    'Found 3 matches for pattern "world" in the workspace directory',
  );
  expect(result.llmContent).toContain('File: fileA.txt');
  expect(result.returnDisplay).toBe('Found 3 matches');
});
```

**Error handling testing** (`packages/core/src/tools/read-file.test.ts:196-214`):

```typescript
it('should return error if file does not exist', async () => {
  const filePath = path.join(tempRootDir, 'nonexistent.txt');
  const params: ReadFileToolParams = { absolute_path: filePath };
  const invocation = tool.build(params) as ToolInvocation<
    ReadFileToolParams,
    ToolResult
  >;

  const result = await invocation.execute(abortSignal);
  expect(result).toEqual({
    llmContent:
      'Could not read file because no file was found at the specified path.',
    returnDisplay: 'File not found.',
    error: {
      message: `File not found: ${filePath}`,
      type: ToolErrorType.FILE_NOT_FOUND,
    },
  });
});
```

## Common Patterns

### 1. Path Validation and Security

```typescript
// Validate path is within workspace
const workspaceContext = this.config.getWorkspaceContext();
const absolutePath = path.resolve(this.config.getTargetDir(), relativePath);

if (!workspaceContext.isPathWithinWorkspace(absolutePath)) {
  const directories = workspaceContext.getDirectories();
  throw new Error(
    `Path validation failed: Path "${relativePath}" is outside workspace directories: ${directories.join(', ')}`,
  );
}

// Check if path should be ignored
const fileService = this.config.getFileService();
if (fileService.shouldAlfredIgnoreFile(absolutePath)) {
  return `File path '${absolutePath}' is ignored by .alfredignore pattern(s).`;
}
```

### 2. Streaming Output

```typescript
class MyToolInvocation extends BaseToolInvocation<MyToolParams, ToolResult> {
  async execute(
    signal: AbortSignal,
    updateOutput?: (output: string) => void,
  ): Promise<ToolResult> {
    // Stream output as it becomes available
    if (updateOutput) {
      updateOutput('Starting process...\n');
      // Do work
      updateOutput('Step 1 complete\n');
      // More work
      updateOutput('Step 2 complete\n');
    }

    return { llmContent: 'Done', returnDisplay: 'Done' };
  }
}

export class MyTool extends BaseDeclarativeTool<MyToolParams, ToolResult> {
  constructor(config: Config) {
    super(
      MyTool.Name,
      'MyTool',
      'Description',
      Kind.Other,
      schema,
      true, // isOutputMarkdown
      true, // canUpdateOutput = true for streaming
    );
  }
}
```

### 3. Abort Signal Handling

```typescript
async execute(signal: AbortSignal): Promise<ToolResult> {
  // Check if operation was aborted
  if (signal.aborted) {
    throw new Error('Operation aborted');
  }

  // Long-running operation
  for (const item of items) {
    if (signal.aborted) {
      throw new Error('Operation aborted');
    }
    // Process item
  }

  return result;
}
```

### 4. Abort Signal Handling

```typescript
async execute(signal: AbortSignal): Promise<ToolResult> {
  // Check if operation was aborted before starting
  if (signal.aborted) {
    throw new Error('Operation aborted');
  }

  // Long-running operation with periodic abort checks
  for (const item of items) {
    if (signal.aborted) {
      throw new Error('Operation aborted');
    }
    // Process item
    await processItem(item);
  }

  // Pass signal to async operations
  const result = await someAsyncOperation(signal);

  return { llmContent: result, returnDisplay: result };
}
```

### 5. Complex Validation

```typescript
protected override validateToolParamValues(
  params: MyToolParams,
): string | null {
  // Empty check
  if (!params.input || params.input.trim() === '') {
    return 'input parameter must be non-empty';
  }

  // Range check
  if (params.count !== undefined && (params.count < 1 || params.count > 100)) {
    return 'count must be between 1 and 100';
  }

  // Pattern check
  if (params.pattern) {
    try {
      new RegExp(params.pattern);
    } catch (error) {
      return `Invalid regex pattern: ${error}`;
    }
  }

  // Path security check
  if (params.path) {
    const absolutePath = path.resolve(this.config.getTargetDir(), params.path);
    const workspace = this.config.getWorkspaceContext();
    if (!workspace.isPathWithinWorkspace(absolutePath)) {
      return `Path must be within workspace`;
    }
  }

  return null;
}
```

## Important Rules

### ✅ DO:

1. **Naming Conventions**
   - Use snake_case for static `Name` property (API identifier)
   - Use PascalCase for class names
   - Use kebab-case for file names
   - Add `Tool` suffix to class names

2. **Type Safety**
   - NEVER use `any` type
   - Define explicit parameter interfaces
   - Use `unknown` with type guards for external data
   - Return proper `ToolResult` from execute()

3. **Validation**
   - Validate all parameters in `validateToolParamValues()`
   - Check path security for file operations
   - Return descriptive error messages
   - Use appropriate `ToolErrorType` enums

4. **Error Handling**
   - Catch and handle all errors in `execute()`
   - Return errors in ToolResult format
   - Include error type from `ToolErrorType` enum
   - Provide both LLM and user-facing error messages

5. **Configuration**
   - Accept `Config` in constructor
   - Use Config methods to access services
   - Respect workspace boundaries
   - Check `.alfredignore` patterns

6. **Confirmation & Approval**
   - Override `shouldConfirmExecute()` for mutating tools (Edit, Delete, Move, Execute)
   - Return appropriate confirmation type (edit, exec, mcp)
   - Implement allowlisting for repeated operations
   - Handle `ProceedAlways` outcome to auto-approve future calls

7. **Tool Locations**
   - Override `toolLocations()` to return affected file paths
   - Include line numbers when relevant
   - Return empty array if tool doesn't affect files

8. **Testing**
   - Write comprehensive tests for all tools
   - Test validation logic thoroughly
   - Test success and error cases
   - Test confirmation logic for mutating tools
   - Mock external dependencies

9. **Documentation**
   - Add clear parameter descriptions in schema
   - Write detailed tool descriptions for LLM
   - Add JSDoc comments for complex logic
   - Include copyright header

### ❌ DON'T:

1. **Never bypass validation** - Always validate parameters, especially paths
2. **Never use `any` type** - Use proper TypeScript types or `unknown` with guards
3. **Never mutate params** - Treat parameters as immutable
4. **Never access filesystem directly outside workspace** - Always validate paths
5. **Never throw errors from build()** - Return validation errors via string
6. **Never skip error handling in execute()** - Always catch and return ToolResult with error
7. **Never skip shouldConfirmExecute() for mutating tools** - Always implement confirmation for tools with side effects
8. **Never use console.log** - Use the OpenTelemetry logging system from `packages/core/src/telemetry/loggers.ts`
9. **Never register tools directly** - Always register through Config.createToolRegistry()
10. **Never hardcode paths** - Use Config methods to get directories
11. **Never skip tests** - Write tests for every new tool

## Verification Workflow

**Before considering tool work complete:**

```bash
# 1. Format code
npm run format

# 2. Type check
npm run typecheck

# 3. Lint code
npm run lint

# 4. Run tests
npm test -- packages/core/src/tools/my-tool.test.ts

# 5. Build
npm run build

# 6. Run all tests
npm run test:ci
```

**Or use the comprehensive preflight check:**

```bash
npm run preflight
```

This runs: `clean → install → format → lint:ci → build → typecheck → test:ci`

**After any code changes:**

- Restart the entire verification cycle
- Never declare done without all checks passing
- Test both success and error cases
- Verify tool appears in `/tools` command output

## File Location Reference

**Tool files:**

- Implementation: `packages/core/src/tools/[tool-name].ts`
- Tests: `packages/core/src/tools/[tool-name].test.ts`

**Test files:**

- Co-located: `packages/core/src/tools/[tool-name].test.ts`

**Integration points:**

- Registration: `packages/core/src/config/config.ts:1040-1109`
- Imports: `packages/core/src/config/config.ts:19-31,54,70`
- Schema (if settings needed): `packages/core/src/config/settingsSchema.ts`

**Base classes and types:**

- Tool interfaces: `packages/core/src/tools/tools.ts`
- Tool registry: `packages/core/src/tools/tool-registry.ts`
- Error types: `packages/core/src/tools/tool-error.ts`

**Test utilities:**

- Mock workspace: `packages/core/src/test-utils/mockWorkspaceContext.js`

## Additional Resources

- **Base tool classes**: `packages/core/src/tools/tools.ts` - Complete interfaces and base implementations
- **Existing tools**: Browse `packages/core/src/tools/` for real examples
- **Testing examples**: Look at `.test.ts` files for patterns
- **Project guidelines**: `/CLAUDE.md` and `.claude/CLAUDE.md`

## Quick Reference Checklist

When creating a new tool:

- [ ] Create tool file at `packages/core/src/tools/[tool-name].ts`
- [ ] Define parameter interface with proper TypeScript types
- [ ] Implement `ToolInvocation` class extending `BaseToolInvocation`
- [ ] Implement `getDescription()` method
- [ ] Implement `toolLocations()` method (return affected file paths)
- [ ] Override `shouldConfirmExecute()` if tool has side effects (mutating)
- [ ] Implement `execute()` method with proper error handling
- [ ] Create tool class extending `BaseDeclarativeTool`
- [ ] Define static `Name` property (snake_case)
- [ ] Set proper `Kind` enum value
- [ ] Define JSON schema for parameters
- [ ] Override `validateToolParamValues()` for custom validation
- [ ] Implement `createInvocation()` method
- [ ] Create test file at `packages/core/src/tools/[tool-name].test.ts`
- [ ] Write tests for validation, description, and execution
- [ ] Test both success and error cases
- [ ] Import tool in `packages/core/src/config/config.ts`
- [ ] Register tool in `Config.createToolRegistry()` method
- [ ] (Optional) Add setting to `settingsSchema.ts` if conditional
- [ ] (Optional) Add getter to `Config` class if conditional
- [ ] Run `npm run format`
- [ ] Run `npm run lint`
- [ ] Run `npm run typecheck`
- [ ] Run `npm run build`
- [ ] Run `npm run test:ci`
- [ ] Verify tool appears in `/tools` command
- [ ] Test tool with actual LLM interaction
