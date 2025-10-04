# Request Flow Analysis

## Entry Points Overview

The Alfred CLI application has two primary entry points that handle different interaction modes:

### 1. Interactive Mode Entry Point

- **File**: `packages/cli/src/gemini.tsx` - `main()` function
- **Trigger**: User launches `gemini` command without `--prompt` flag or with `--prompt-interactive`
- **Flow**:
  - Parses command-line arguments via `parseArguments()`
  - Loads settings and configuration
  - Initializes the application via `initializeApp()`
  - Renders the React-based TUI via `startInteractiveUI()`
  - Entry point wraps the app in `AppWrapper` component with context providers

### 2. Non-Interactive Mode Entry Point

- **File**: `packages/cli/src/nonInteractiveCli.ts` - `runNonInteractive()` function
- **Trigger**: User provides input via stdin or `--prompt` flag
- **Flow**:
  - Receives pre-processed input from `main()`
  - Validates authentication via `validateNonInteractiveAuth()`
  - Processes commands directly without UI rendering
  - Outputs results to stdout (text or JSON format)
  - Exits after completion

### 3. Command-Line Argument Processing

- **File**: `packages/cli/src/config/config.ts` - `parseArguments()` function
- **Purpose**: Parses and validates all CLI flags and arguments
- **Key Arguments**:
  - `--prompt` / `-p`: Non-interactive prompt
  - `--prompt-interactive` / `-i`: Interactive prompt
  - `--model` / `-m`: Model selection
  - `--debug` / `-d`: Debug mode
  - `--yolo` / `-y`: Auto-approve all actions
  - `--approval-mode`: Approval mode (default, auto_edit, yolo)
  - `--output-format` / `-o`: Output format (text, json)

## Request Routing Map

### Interactive Mode Request Flow

```
User Input (Terminal)
    ↓
InputPrompt Component (packages/cli/src/ui/components/InputPrompt.tsx)
    ↓
Text Buffer Processing (useTextBuffer hook)
    ↓
Command Type Detection
    ├─→ Slash Command (/help, /clear, etc.)
    │   └─→ useSlashCommandProcessor hook
    │       └─→ Command handlers in packages/cli/src/ui/commands/
    │
    ├─→ At Command (@file, @include)
    │   └─→ handleAtCommand (packages/cli/src/ui/hooks/atCommandProcessor.ts)
    │       └─→ File inclusion and context expansion
    │
    ├─→ Shell Command (when in shell mode)
    │   └─→ useShellCommandProcessor hook
    │       └─→ ShellExecutionService (packages/core/src/services/shellExecutionService.ts)
    │
    └─→ Regular Prompt
        └─→ useGeminiStream hook (packages/cli/src/ui/hooks/useGeminiStream.ts)
            └─→ GeminiClient (packages/core/src/core/client.ts)
                └─→ ContentGenerator (packages/core/src/core/contentGenerator.ts)
                    └─→ Gemini API
```

### Non-Interactive Mode Request Flow

```
User Input (stdin/--prompt)
    ↓
runNonInteractive() (packages/cli/src/nonInteractiveCli.ts)
    ↓
Command Type Detection
    ├─→ Slash Command
    │   └─→ handleSlashCommand (packages/cli/src/nonInteractiveCliCommands.ts)
    │
    ├─→ At Command
    │   └─→ handleAtCommand
    │
    └─→ Regular Prompt
        └─→ GeminiClient.sendMessageStream()
            └─→ Stream processing loop
                ├─→ Content events → stdout
                └─→ Tool call events → executeToolCall()
```

### Tool Call Request Flow

```
Gemini API Response (with tool calls)
    ↓
Turn.processResponse() (packages/core/src/core/turn.ts)
    ↓
Tool Call Request Events (AlfredEventType.ToolCallRequest)
    ↓
CoreToolScheduler (packages/core/src/core/coreToolScheduler.ts)
    ├─→ Validation Phase
    │   └─→ Tool lookup in ToolRegistry
    │
    ├─→ Confirmation Phase (if required)
    │   ├─→ PolicyEngine.check() (packages/core/src/policy/policy-engine.ts)
    │   │   ├─→ ALLOW → Auto-approve
    │   │   ├─→ DENY → Auto-reject
    │   │   └─→ ASK_USER → Request user confirmation
    │   │
    │   └─→ MessageBus (packages/core/src/confirmation-bus/message-bus.ts)
    │       └─→ UI confirmation dialog (interactive mode)
    │
    ├─→ Execution Phase
    │   └─→ Tool.execute() (specific tool implementation)
    │       └─→ Tool-specific logic (file ops, shell, web fetch, etc.)
    │
    └─→ Response Phase
        └─→ Convert to FunctionResponse
            └─→ Send back to Gemini API
```

## Middleware Pipeline

### 1. Configuration Loading Middleware

- **Location**: `packages/cli/src/config/config.ts` - `loadCliConfig()`
- **Purpose**: Loads and merges configuration from multiple sources
- **Order**:
  1. Default settings
  2. User settings (`~/.gemini/settings.json`)
  3. Workspace settings (`.gemini/settings.json`)
  4. Command-line arguments
  5. Environment variables

### 2. Authentication Middleware

- **Location**: `packages/cli/src/config/auth.ts` - `validateAuthMethod()`
- **Purpose**: Validates and initializes authentication
- **Flow**:
  - Checks for API key in environment or settings
  - Validates OAuth credentials if using OAuth
  - Falls back to default authentication if needed
  - Stores credentials securely

### 3. Extension Loading Middleware

- **Location**: `packages/cli/src/config/extension.ts` - `loadExtensions()`
- **Purpose**: Loads and validates extensions
- **Flow**:
  - Scans extension directories
  - Validates extension manifests
  - Loads extension configurations
  - Registers extension tools and commands

### 4. Policy Engine Middleware

- **Location**: `packages/core/src/policy/policy-engine.ts` - `PolicyEngine`
- **Purpose**: Enforces security policies for tool execution
- **Flow**:
  - Checks tool call against policy rules
  - Returns ALLOW, DENY, or ASK_USER decision
  - Applies non-interactive mode restrictions

### 5. Telemetry Middleware

- **Location**: `packages/core/src/telemetry/`
- **Purpose**: Collects and exports telemetry data
- **Flow**:
  - Captures user prompts (if enabled)
  - Tracks tool calls and outcomes
  - Records performance metrics
  - Exports to configured target (local/GCP)

### 6. Console Patching Middleware

- **Location**: `packages/cli/src/ui/utils/ConsolePatcher.ts`
- **Purpose**: Intercepts console output for display in UI
- **Flow**:
  - Patches console.log, console.error, etc.
  - Captures output for display in debug console
  - Restores original console on cleanup

## Controller/Handler Analysis

### Primary Controllers

#### 1. AppContainer (Main UI Controller)

- **File**: `packages/cli/src/ui/AppContainer.tsx`
- **Responsibilities**:
  - Manages overall application state
  - Coordinates between UI components and core logic
  - Handles user input and command processing
  - Manages history and session state
  - Controls dialog visibility and interactions

#### 2. GeminiClient (Core API Controller)

- **File**: `packages/core/src/core/client.ts`
- **Responsibilities**:
  - Manages communication with Gemini API
  - Handles chat history and context
  - Coordinates turn-based conversation flow
  - Manages compression and token limits
  - Handles model switching and fallback

#### 3. CoreToolScheduler (Tool Execution Controller)

- **File**: `packages/core/src/core/coreToolScheduler.ts`
- **Responsibilities**:
  - Schedules and executes tool calls
  - Manages tool call lifecycle (validation → confirmation → execution → response)
  - Handles parallel and sequential tool execution
  - Manages tool output updates and streaming
  - Coordinates with PolicyEngine for approval

#### 4. ToolRegistry (Tool Management Controller)

- **File**: `packages/core/src/tools/tool-registry.ts`
- **Responsibilities**:
  - Registers and manages available tools
  - Provides tool lookup by name
  - Manages MCP server connections
  - Handles tool discovery and dynamic registration

### Command Handlers

All command handlers follow a consistent pattern:

```typescript
interface SlashCommand {
  name: string;
  altNames?: string[];
  kind: CommandKind;
  description: string;
  action: (context: CommandContext) => Promise<void>;
}
```

**Location**: `packages/cli/src/ui/commands/`

**Key Handlers**:

- `helpCommand.ts` - Display help information
- `clearCommand.ts` - Clear conversation history
- `modelCommand.ts` - Switch models
- `authCommand.ts` - Manage authentication
- `settingsCommand.ts` - Modify settings
- `memoryCommand.ts` - Manage memory/context
- `toolsCommand.ts` - List and manage tools
- `quitCommand.ts` - Exit application

### Tool Handlers

All tools implement the `AnyDeclarativeTool` interface:

```typescript
interface AnyDeclarativeTool {
  name: string;
  displayName: string;
  description: string;
  kind: Kind;
  parameterSchema: Record<string, unknown>;
  isOutputMarkdown: boolean;
  canUpdateOutput: boolean;
  createInvocation(params: unknown): ToolInvocation;
}
```

**Location**: `packages/core/src/tools/`

**Key Tool Handlers**:

- `shell.ts` - Execute shell commands
- `read-file.ts` - Read file contents
- `write-file.ts` - Write file contents
- `edit.ts` - Edit file with search/replace
- `glob.ts` - Find files by pattern
- `grep.ts` - Search file contents
- `web-fetch.ts` - Fetch web content
- `web-search.ts` - Search the web
- `memoryTool.ts` - Manage conversation memory
- `mcp-tool.ts` - MCP server tool wrapper

## Authentication & Authorization Flow

### Authentication Flow

```
Application Start
    ↓
Load Settings (packages/cli/src/config/settings.ts)
    ↓
Determine Auth Type
    ├─→ API Key (from env or settings)
    │   └─→ Validate API key format
    │       └─→ Store in ContentGeneratorConfig
    │
    ├─→ OAuth (Login with Google)
    │   └─→ Check for cached credentials
    │       ├─→ Valid → Use cached
    │       └─→ Invalid/Missing → Initiate OAuth flow
    │           └─→ Open browser for authorization
    │               └─→ Receive and store tokens
    │
    ├─→ Cloud Shell
    │   └─→ Use Cloud Shell credentials
    │       └─→ Automatic authentication
    │
    └─→ Service Account
        └─→ Load service account key
            └─→ Authenticate with key
```

### Authorization Flow (Tool Execution)

```
Tool Call Request
    ↓
PolicyEngine.check() (packages/core/src/policy/policy-engine.ts)
    ↓
Match Against Policy Rules (priority-ordered)
    ├─→ Rule Match Found
    │   ├─→ ALLOW → Auto-approve
    │   ├─→ DENY → Auto-reject
    │   └─→ ASK_USER → Request confirmation
    │
    └─→ No Rule Match
        └─→ Use Default Decision
            ├─→ Interactive Mode → ASK_USER
            └─→ Non-Interactive Mode → DENY
```

### Policy Rule Structure

```typescript
interface PolicyRule {
  toolName?: string; // Tool name or pattern (e.g., "serverName__*")
  argsPattern?: RegExp; // Regex pattern for arguments
  decision: PolicyDecision; // ALLOW, DENY, or ASK_USER
  priority?: number; // Higher priority rules checked first
}
```

### Approval Modes

1. **Default Mode**: Prompt for approval on all modifying operations
2. **Auto Edit Mode**: Auto-approve edit tools (replace, write_file)
3. **YOLO Mode**: Auto-approve all tools (use with caution)

**Configuration**: `--approval-mode` flag or `security.approvalMode` setting

### Tool Confirmation Flow

```
Tool Requires Confirmation
    ↓
shouldConfirmExecute() (tool-specific)
    ↓
Returns ToolCallConfirmationDetails
    ├─→ type: 'exec' (shell command)
    │   └─→ Shows command and root command
    │
    ├─→ type: 'edit' (file edit)
    │   └─→ Shows diff preview
    │
    └─→ type: 'write' (file write)
        └─→ Shows file path and content preview
    ↓
MessageBus.publish(TOOL_CONFIRMATION_REQUEST)
    ↓
UI Displays Confirmation Dialog
    ↓
User Response
    ├─→ Proceed → Execute tool
    ├─→ Proceed Always → Execute + Add to allowlist
    ├─→ Reject → Cancel tool
    └─→ Reject Always → Cancel + Add to denylist
```

## Error Handling Pathways

### Error Categories

#### 1. Input Validation Errors

- **Location**: `packages/cli/src/config/config.ts` - `parseArguments()`
- **Handling**:
  - Invalid arguments → Display error + help text
  - Missing required values → Prompt user or exit
  - Invalid combinations → Display error message

#### 2. Authentication Errors

- **Location**: `packages/cli/src/config/auth.ts`
- **Types**:
  - `UnauthorizedError` - Invalid credentials
  - `AuthenticationError` - Auth flow failure
- **Handling**:
  - Display error message
  - Prompt for re-authentication
  - Clear cached credentials if invalid

#### 3. API Errors

- **Location**: `packages/core/src/core/client.ts`
- **Types**:
  - Quota exceeded → Fallback to Flash model
  - Rate limiting → Retry with backoff
  - Network errors → Retry with exponential backoff
  - Invalid request → Display error details
- **Handling**:
  - Parse API error response
  - Extract user-friendly message
  - Log detailed error for debugging
  - Attempt recovery or fallback

#### 4. Tool Execution Errors

- **Location**: `packages/core/src/core/coreToolScheduler.ts`
- **Types**:
  - Tool not found → Display error
  - Invalid parameters → Validation error
  - Execution failure → Tool-specific error
  - Timeout → Cancellation error
- **Handling**:
  - Capture error details
  - Format for LLM consumption
  - Display to user
  - Send error response to Gemini API

#### 5. File System Errors

- **Location**: Tool implementations (e.g., `packages/core/src/tools/read-file.ts`)
- **Types**:
  - File not found → `ENOENT`
  - Permission denied → `EACCES`
  - Invalid path → Path validation error
- **Handling**:
  - Catch and wrap errors
  - Provide helpful error messages
  - Suggest corrections if possible

### Error Response Flow

```
Error Occurs
    ↓
Error Captured
    ↓
Error Type Determination
    ├─→ Fatal Error (FatalConfigError, FatalInputError)
    │   └─→ Display error
    │       └─→ Exit application
    │
    ├─→ Recoverable Error
    │   └─→ Display error
    │       └─→ Continue operation
    │
    └─→ Tool Execution Error
        └─→ Format error for LLM
            └─→ Send to Gemini API
                └─→ LLM processes error
                    └─→ Generate recovery response
```

### Error Formatting

**For LLM Consumption**:

```typescript
{
  llmContent: string,           // Error message for LLM
  returnDisplay: string,        // Error message for user
  error: {
    message: string,
    type: ToolErrorType
  }
}
```

**For User Display**:

- Formatted error messages with context
- Suggestions for resolution
- Debug information (if debug mode enabled)

## Request Context Propagation

### Context Types

#### 1. Prompt Context

- **Propagation**: Via `promptIdContext` (AsyncLocalStorage)
- **Scope**: Single prompt/response cycle
- **Usage**: Telemetry correlation, logging
- **Implementation**: `packages/core/src/utils/promptIdContext.ts`

#### 2. Session Context

- **Propagation**: Via React Context (`SessionContext`)
- **Scope**: Entire application session
- **Usage**: Session statistics, history management
- **Implementation**: `packages/cli/src/ui/contexts/SessionContext.tsx`

#### 3. Configuration Context

- **Propagation**: Via React Context (`ConfigContext`)
- **Scope**: Application lifetime
- **Usage**: Access to Config object throughout UI
- **Implementation**: `packages/cli/src/ui/contexts/ConfigContext.tsx`

#### 4. Settings Context

- **Propagation**: Via React Context (`SettingsContext`)
- **Scope**: Application lifetime
- **Usage**: Access to user settings throughout UI
- **Implementation**: `packages/cli/src/ui/contexts/SettingsContext.tsx`

#### 5. Streaming Context

- **Propagation**: Via React Context (`StreamingContext`)
- **Scope**: Current streaming operation
- **Usage**: Track streaming state (Idle, Responding, WaitingForConfirmation)
- **Implementation**: `packages/cli/src/ui/contexts/StreamingContext.tsx`

### Context Flow Example

```
User Submits Prompt
    ↓
promptIdContext.run(prompt_id, async () => {
    ↓
    useGeminiStream hook
        ↓
        GeminiClient.sendMessageStream()
            ↓
            Turn.processResponse()
                ↓
                Tool Execution
                    ↓
                    Telemetry Logging (uses prompt_id from context)
                    ↓
                Tool Response
            ↓
        Stream Events
    ↓
    UI Updates (uses SessionContext, StreamingContext)
})
```

### Context Providers Hierarchy

```
AppWrapper
  └─→ SettingsContext.Provider
      └─→ ThemeProvider
          └─→ KeypressProvider
              └─→ SessionStatsProvider
                  └─→ VimModeProvider
                      └─→ AppContainer
                          └─→ StreamingContext.Provider
                              └─→ App
                                  └─→ UI Components
```

## Request Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INPUT                                   │
│  (Terminal, stdin, --prompt flag)                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ENTRY POINT ROUTING                               │
│  ┌──────────────────┐              ┌──────────────────┐            │
│  │  Interactive     │              │  Non-Interactive │            │
│  │  Mode            │              │  Mode            │            │
│  │  (gemini.tsx)    │              │  (nonInteractiveCli.ts)      │
│  └────────┬─────────┘              └────────┬─────────┘            │
└───────────┼──────────────────────────────────┼──────────────────────┘
            │                                  │
            ▼                                  ▼
┌───────────────────────┐          ┌───────────────────────┐
│  UI RENDERING         │          │  DIRECT PROCESSING    │
│  (AppContainer)       │          │  (runNonInteractive)  │
└───────────┬───────────┘          └───────────┬───────────┘
            │                                  │
            ▼                                  │
┌───────────────────────┐                     │
│  INPUT PROCESSING     │                     │
│  - Text Buffer        │                     │
│  - Command Detection  │                     │
└───────────┬───────────┘                     │
            │                                  │
            ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    COMMAND TYPE ROUTING                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Slash        │  │ At           │  │ Regular      │             │
│  │ Command      │  │ Command      │  │ Prompt       │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
└─────────┼──────────────────┼──────────────────┼──────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Command Handler │  │ File Inclusion  │  │ Gemini API      │
│ (UI Commands)   │  │ (atCommandProc) │  │ (GeminiClient)  │
└─────────────────┘  └─────────────────┘  └────────┬────────┘
                                                    │
                                                    ▼
                                          ┌─────────────────┐
                                          │ Content         │
                                          │ Generator       │
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ Gemini API      │
                                          │ Request         │
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ API Response    │
                                          │ Stream          │
                                          └────────┬────────┘
                                                   │
                     ┌─────────────────────────────┴─────────────────────────────┐
                     │                                                           │
                     ▼                                                           ▼
          ┌──────────────────────┐                                   ┌──────────────────────┐
          │ Content Events       │                                   │ Tool Call Events     │
          │ (Text streaming)     │                                   │ (Function calls)     │
          └──────────┬───────────┘                                   └──────────┬───────────┘
                     │                                                           │
                     ▼                                                           ▼
          ┌──────────────────────┐                                   ┌──────────────────────┐
          │ Display to User      │                                   │ CoreToolScheduler    │
          └──────────────────────┘                                   └──────────┬───────────┘
                                                                                 │
                                                                                 ▼
                                                                      ┌──────────────────────┐
                                                                      │ Tool Validation      │
                                                                      │ (ToolRegistry)       │
                                                                      └──────────┬───────────┘
                                                                                 │
                                                                                 ▼
                                                                      ┌──────────────────────┐
                                                                      │ Policy Check         │
                                                                      │ (PolicyEngine)       │
                                                                      └──────────┬───────────┘
                                                                                 │
                                                    ┌────────────────────────────┴────────────────────────────┐
                                                    │                                                         │
                                                    ▼                                                         ▼
                                         ┌──────────────────────┐                              ┌──────────────────────┐
                                         │ ALLOW                │                              │ ASK_USER             │
                                         │ (Auto-approve)       │                              │ (Request confirm)    │
                                         └──────────┬───────────┘                              └──────────┬───────────┘
                                                    │                                                     │
                                                    │                                                     ▼
                                                    │                                          ┌──────────────────────┐
                                                    │                                          │ User Confirmation    │
                                                    │                                          │ (MessageBus)         │
                                                    │                                          └──────────┬───────────┘
                                                    │                                                     │
                                                    │                                                     ▼
                                                    │                                          ┌──────────────────────┐
                                                    │                                          │ Approve/Reject       │
                                                    │                                          └──────────┬───────────┘
                                                    │                                                     │
                                                    └─────────────────────────────────────────────────────┘
                                                                                 │
                                                                                 ▼
                                                                      ┌──────────────────────┐
                                                                      │ Tool Execution       │
                                                                      │ (Tool.execute())     │
                                                                      └──────────┬───────────┘
                                                                                 │
                                                                                 ▼
                                                                      ┌──────────────────────┐
                                                                      │ Tool Response        │
                                                                      │ (FunctionResponse)   │
                                                                      └──────────┬───────────┘
                                                                                 │
                                                                                 ▼
                                                                      ┌──────────────────────┐
                                                                      │ Send to Gemini API   │
                                                                      └──────────┬───────────┘
                                                                                 │
                                                                                 ▼
                                                                      ┌──────────────────────┐
                                                                      │ Final Response       │
                                                                      └──────────┬───────────┘
                                                                                 │
                                                                                 ▼
                                                                      ┌──────────────────────┐
                                                                      │ Display to User      │
                                                                      └──────────────────────┘
```

### Key Flow Characteristics

1. **Dual Entry Points**: Interactive and non-interactive modes have separate entry points but converge at the core API layer

2. **Command Routing**: Three types of commands (slash, at, regular) are routed to different handlers before reaching the API

3. **Streaming Architecture**: API responses are streamed, allowing real-time display of content and tool execution

4. **Tool Execution Pipeline**: Tool calls go through validation → policy check → confirmation → execution → response

5. **Context Propagation**: Request context (prompt ID, session info) flows through the entire pipeline via AsyncLocalStorage and React Context

6. **Error Handling**: Errors at any stage are caught, formatted appropriately, and either displayed to user or sent back to the API for recovery

7. **State Management**: UI state is managed via React hooks and contexts, while core state is managed by the GeminiClient and ToolScheduler

8. **Approval Flow**: Tool execution can be auto-approved, auto-rejected, or require user confirmation based on policy rules and approval mode
