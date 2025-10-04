# Data Flow Analysis

## Data Models Overview

### Core Data Structures

#### IContent - Universal Content Representation

The system uses a provider-agnostic content model (`IContent`) that represents all conversation data as blocks within a speaker's turn:

**Structure:**

- `speaker`: 'human' | 'ai' | 'tool' - Identifies the message source
- `blocks`: Array of `ContentBlock` - Contains the actual content
- `metadata`: Optional metadata including timestamps, model info, token usage, provider info

**Content Block Types:**

- `TextBlock`: Regular text content
- `ToolCallBlock`: AI calling a tool/function with id, name, and parameters
- `ToolResponseBlock`: Response from tool execution with callId, toolName, result/error
- `MediaBlock`: Images, files with MIME type, data (URL or base64), encoding
- `ThinkingBlock`: Reasoning content for models that support it
- `CodeBlock`: Code with language, filename, execution results

**Key Features:**

- Provider-agnostic design allows multiple LLM providers (Gemini, Anthropic, OpenAI)
- Normalized tool call IDs using format: `hist_tool_<uuid-v4>`
- Supports synthetic content generation for auto-generated messages
- Token usage tracking at content level

#### Tool System Data Models

**ToolInvocation Interface:**

```typescript
interface ToolInvocation<TParams, TResult> {
  params: TParams;
  getDescription(): string;
  toolLocations(): ToolLocation[];
  shouldConfirmExecute(
    signal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false>;
  execute(signal: AbortSignal, updateOutput?, shellConfig?): Promise<TResult>;
}
```

**Tool Builder Pattern:**

- `DeclarativeTool` base class separates validation from execution
- Schema validation using `SchemaValidator`
- Function declarations from `@google/genai`
- Support for markdown output and streaming updates

**Tool Categories (Kind enum):**

- `READ`: File reading operations
- `WRITE`: File writing/editing operations
- `SHELL`: Shell command execution
- `SEARCH`: Search and discovery operations
- `MEMORY`: Memory/context operations
- `WEB`: Web fetching and search
- `MCP`: Model Context Protocol tools

#### Configuration Data Models

**Config Class:**
Central configuration hub managing:

- Session state (sessionId, model, approvalMode)
- Tool registry and prompt registry
- Content generator and provider manager
- Workspace context (multiple directories)
- File system service and discovery service
- Telemetry settings
- MCP server configurations
- Policy engine configuration

**Settings Hierarchy:**

1. Ephemeral settings (highest priority - from commands)
2. Provider-specific settings in SettingsService
3. Provider config (IProviderConfig)
4. Default values

**Storage Locations:**

- Global: `~/.alfred/` - User settings, OAuth tokens, memory
- Project: `.alfred/` - Workspace settings, extensions
- Temporary: `~/.alfred/tmp/<hash>/` - Session data, checkpoints

## Data Transformation Map

### Input Processing Flow

**1. User Input → Prompt Processing**

```
User Input (string)
  ↓
atCommandProcessor → Processes @file references
  ↓
shellCommandProcessor → Handles shell command syntax
  ↓
slashCommandProcessor → Processes /commands
  ↓
Processed Prompt (PartListUnion)
```

**2. Content Generation Pipeline**

```
Processed Prompt
  ↓
ContentGenerator (provider-specific)
  ↓
Provider API (Gemini/Anthropic/OpenAI)
  ↓
Raw Response Stream
  ↓
ContentConverters → IContent blocks
  ↓
HistoryService.add()
```

### Provider-Specific Transformations

**Gemini Provider:**

- Input: `Content[]` (Gemini format)
- Output: `GenerateContentResponse`
- Transformation: Direct API mapping with thinking support

**Anthropic Provider:**

- Input: Converts IContent → Anthropic message format
- Output: Anthropic streaming response
- Transformation: Maps tool calls to Anthropic's format

**OpenAI Provider:**

- Input: Converts IContent → OpenAI chat format
- Output: OpenAI streaming response
- Transformation: Handles both Chat Completions and Responses API

### Tool Execution Flow

**Tool Call Transformation:**

```
AI Response (tool_call block)
  ↓
ToolRegistry.getTool(name)
  ↓
ToolBuilder.build(params) → Validates parameters
  ↓
ToolInvocation.shouldConfirmExecute() → Policy check
  ↓
MessageBus confirmation (if enabled)
  ↓
ToolInvocation.execute() → Actual execution
  ↓
ToolResult → tool_response block
  ↓
Back to conversation history
```

**File Operation Transformations:**

- `WriteFileTool`: Content → File system write → Diff generation
- `EditTool`: Old/new strings → Diff → File patch → Verification
- `ReadFileTool`: File path → Content with language detection → Text block

### History Compression

**Compression Pipeline:**

```
Full History (IContent[])
  ↓
findCompressSplitPoint() → Determines compression boundary
  ↓
Summarization Request → BaseLlmClient
  ↓
Summary Content (IContent with isSummary=true)
  ↓
Replace old content with summary
  ↓
Compressed History
```

**Compression Triggers:**

- Token count exceeds 70% of model limit
- Preserves last 30% of conversation
- Maintains tool call/response pairs
- Locks during compression to prevent race conditions

## Storage Interactions

### File System Operations

**FileSystemService Interface:**

- `readTextFile(path)`: Reads file with encoding detection
- `writeFile(path, content)`: Writes with atomic operations
- `exists(path)`: Checks file existence
- `stat(path)`: Gets file metadata
- `readdir(path)`: Lists directory contents

**File Discovery:**

```
FileDiscoveryService
  ↓
Crawler (with ignore patterns)
  ↓
CrawlCache (in-memory caching)
  ↓
ResultCache (search result caching)
  ↓
File list with metadata
```

**Ignore Pattern Processing:**

- `.gitignore` parsing via `gitIgnoreParser`
- `.alfredignore` custom patterns
- Configurable respect for ignore files
- Fuzzy search support

### Conversation Persistence

**History Storage:**

```
HistoryService (in-memory)
  ↓
ChatRecordingService (optional)
  ↓
ConversationFileWriter
  ↓
~/.alfred/history/<hash>/session_<id>.json
```

**Checkpoint System:**

```
Turn completion
  ↓
Checkpoint trigger
  ↓
Serialize history + metadata
  ↓
~/.alfred/tmp/<hash>/checkpoints/checkpoint_<n>.json
```

### Settings Persistence

**Settings Cascade:**

```
System Defaults (/etc/alfred-cli/system-defaults.json)
  ↓
System Settings (/etc/alfred-cli/settings.json)
  ↓
User Settings (~/.alfred/settings.json)
  ↓
Workspace Settings (.alfred/settings.json)
  ↓
Ephemeral Settings (in-memory from commands)
```

**Settings Migration:**

- V1 → V2 migration with flat to nested structure
- Preserves comments in JSON files
- Atomic updates using `updateSettingsFilePreservingFormat`

### MCP Token Storage

**OAuth Token Persistence:**

```
MCPOAuthProvider
  ↓
MCPOAuthTokenStorage
  ↓
HybridTokenStorage (keychain + file fallback)
  ↓
~/.alfred/mcp-oauth-tokens.json (encrypted)
```

**Token Storage Hierarchy:**

1. Keychain (macOS/Windows) - Most secure
2. File storage (Linux/fallback) - Encrypted JSON
3. Hybrid approach for cross-platform support

## Validation Mechanisms

### Schema Validation

**Tool Parameter Validation:**

```typescript
SchemaValidator.validate(params, schema)
  ↓
JSON Schema validation
  ↓
Type checking and coercion
  ↓
Validated parameters or ValidationError
```

**Content Validation:**

```typescript
ContentValidation.validate(content: IContent)
  ↓
Check speaker validity
  ↓
Validate block types
  ↓
Ensure tool call/response pairing
  ↓
Verified content or validation errors
```

### Input Sanitization

**Path Validation:**

```
WorkspaceContext.isPathWithinWorkspace(path)
  ↓
Resolve symbolic links
  ↓
Check against workspace directories
  ↓
Boolean (allowed/denied)
```

**File Content Validation:**

- `ensureCorrectFileContent()`: LLM-based content verification
- `ensureCorrectEdit()`: Validates edit operations
- Encoding detection and normalization
- BOM handling for UTF files

### Policy Engine

**Permission Checking:**

```
PolicyEngine.checkPermission(action, context)
  ↓
Load policy rules
  ↓
Evaluate against context
  ↓
Allow/Deny decision
```

**Tool Confirmation Flow:**

```
ToolInvocation.shouldConfirmExecute()
  ↓
MessageBus.publish(ToolConfirmationRequest)
  ↓
UI displays confirmation dialog
  ↓
User decision
  ↓
MessageBus.publish(ToolConfirmationResponse)
  ↓
Tool proceeds or aborts
```

### Error Handling

**Error Types:**

- `ToolError`: Tool execution failures with type classification
- `FatalConfigError`: Configuration errors
- `ValidationError`: Schema validation failures
- `QuotaError`: API quota exceeded

**Error Recovery:**

- Retry with exponential backoff (`retryWithBackoff`)
- Fallback model switching (Flash → Pro)
- Error reporting to telemetry
- User-friendly error messages

## State Management Analysis

### Session State

**GeminiClient State:**

- `chat`: AlfredChat instance (conversation state)
- `sessionTurnCount`: Tracks turns in session
- `loopDetector`: Prevents infinite loops
- `currentSequenceModel`: Model consistency tracking
- `hasFailedCompressionAttempt`: Compression state

**Turn State:**

```typescript
class Turn {
  private history: Content[];
  private toolCalls: Map<string, ToolCall>;
  private pendingToolCalls: Set<string>;
  private completedToolCalls: Set<string>;
}
```

### UI State Management

**UIStateContext:**

```typescript
interface UIState {
  streamingState: StreamingState;
  quittingMessages: boolean;
  dialogManager: DialogManager;
  messageQueue: MessageQueue;
}
```

**Streaming State:**

- `isStreaming`: Boolean flag
- `currentMessage`: Accumulating message content
- `toolExecutions`: Active tool executions
- `thinkingContent`: Reasoning display

### Provider State

**BaseProvider State:**

- `cachedAuthToken`: Short-lived auth cache (1 minute)
- `authCacheTimestamp`: Cache invalidation tracking
- `throttleTracker`: Rate limiting callback
- `providerConfig`: Provider-specific configuration

**ProviderManager State:**

- `activeProvider`: Current provider instance
- `availableProviders`: Map of registered providers
- `modelCache`: Model availability cache

### History Service State

**HistoryService:**

```typescript
class HistoryService {
  private history: IContent[];
  private totalTokens: number;
  private tokenizerCache: Map<string, ITokenizer>;
  private isCompressing: boolean;
  private pendingOperations: Array<() => void>;
}
```

**State Synchronization:**

- Event-driven updates via EventEmitter
- `tokensUpdated` events for UI updates
- Atomic token counting with locks
- Compression queue for pending operations

### Workspace State

**WorkspaceContext:**

- `directories`: Set of workspace directories
- `initialDirectories`: Original workspace state
- `onDirectoriesChangedListeners`: Change notification

**File Discovery State:**

- `CrawlCache`: In-memory directory cache
- `ResultCache`: Search result cache
- Cache invalidation on directory changes

## Serialization Processes

### JSON Serialization

**Safe JSON Handling:**

```typescript
safeJsonStringify(obj, indent?)
  ↓
Detect circular references
  ↓
Replace with [Circular] markers
  ↓
JSON.stringify with error handling
  ↓
String or error message
```

**Comment-Preserving JSON:**

```typescript
updateSettingsFilePreservingFormat(path, updates)
  ↓
Read original file with comments
  ↓
Parse with strip-json-comments
  ↓
Apply updates to parsed object
  ↓
Reconstruct with original formatting
  ↓
Write back to file
```

### Content Serialization

**IContent → Provider Format:**

**Gemini:**

```typescript
IContent → Content {
  role: 'user' | 'model',
  parts: Part[]
}
```

**Anthropic:**

```typescript
IContent → Message {
  role: 'user' | 'assistant',
  content: ContentBlock[]
}
```

**OpenAI:**

```typescript
IContent → ChatCompletionMessage {
  role: 'user' | 'assistant' | 'tool',
  content: string | ContentPart[]
}
```

### Terminal Output Serialization

**ANSI Output:**

```typescript
AnsiOutput {
  text: string;
  ansiCodes: string[];
}
  ↓
terminalSerializer.serialize()
  ↓
Escaped ANSI sequences
  ↓
Terminal display
```

**Markdown Rendering:**

```typescript
Markdown content
  ↓
marked.parse()
  ↓
Terminal-formatted output
  ↓
Syntax highlighting (if code blocks)
  ↓
Rendered display
```

### Binary Data Handling

**Media Serialization:**

```typescript
MediaBlock {
  mimeType: string;
  data: string; // URL or base64
  encoding: 'url' | 'base64';
}
```

**Image Processing:**

- Base64 encoding for inline images
- URL references for external images
- MIME type detection
- Size validation

## Data Lifecycle Diagrams

### Conversation Lifecycle

```
User Input
  ↓
[Input Processing]
  ├─ @file expansion
  ├─ Shell command parsing
  └─ Slash command handling
  ↓
[Content Generation]
  ├─ Provider selection
  ├─ Model routing
  └─ API request
  ↓
[Response Processing]
  ├─ Stream parsing
  ├─ Tool call extraction
  └─ Content block creation
  ↓
[History Management]
  ├─ Add to HistoryService
  ├─ Token counting
  └─ Compression check
  ↓
[Tool Execution] (if tool calls)
  ├─ Validation
  ├─ Confirmation
  ├─ Execution
  └─ Result capture
  ↓
[Response Delivery]
  ├─ UI rendering
  ├─ Telemetry logging
  └─ Checkpoint save
  ↓
[Next Turn or End]
```

### Tool Execution Lifecycle

```
Tool Call Block (from AI)
  ↓
[Discovery]
  ├─ ToolRegistry.getTool(name)
  └─ Validate tool exists
  ↓
[Validation]
  ├─ ToolBuilder.build(params)
  ├─ Schema validation
  └─ Create ToolInvocation
  ↓
[Permission Check]
  ├─ shouldConfirmExecute()
  ├─ Policy engine check
  └─ MessageBus confirmation (if needed)
  ↓
[Execution]
  ├─ execute(signal, updateOutput)
  ├─ File system operations
  ├─ Shell commands
  └─ External API calls
  ↓
[Result Processing]
  ├─ Create ToolResponseBlock
  ├─ Error handling
  └─ Output truncation (if needed)
  ↓
[History Update]
  ├─ Add tool_response block
  ├─ Update token count
  └─ Telemetry logging
  ↓
[Continue Conversation]
```

### File Operation Lifecycle

```
File Path Request
  ↓
[Path Validation]
  ├─ WorkspaceContext.isPathWithinWorkspace()
  ├─ Resolve symbolic links
  └─ Security check
  ↓
[File Discovery] (if search)
  ├─ FileDiscoveryService.search()
  ├─ Apply ignore patterns
  ├─ Cache lookup
  └─ Return matches
  ↓
[File Operation]
  ├─ Read: FileSystemService.readTextFile()
  │   ├─ Encoding detection
  │   ├─ BOM handling
  │   └─ Content return
  │
  ├─ Write: FileSystemService.writeFile()
  │   ├─ Backup creation
  │   ├─ Atomic write
  │   └─ Verification
  │
  └─ Edit: EditTool.execute()
      ├─ Read current content
      ├─ Apply changes
      ├─ Generate diff
      ├─ LLM verification
      └─ Write result
  ↓
[Telemetry]
  ├─ Log operation
  ├─ Record metrics
  └─ Track success/failure
  ↓
[Result Return]
```

### Authentication Flow

```
API Request Needed
  ↓
[Auth Resolution]
  ├─ Check cache (1 min TTL)
  ├─ Ephemeral settings
  ├─ Provider-specific key
  ├─ Environment variables
  └─ OAuth (if enabled)
  ↓
[OAuth Flow] (if needed)
  ├─ Device code request
  ├─ User authorization
  ├─ Token exchange
  └─ Token storage
  ↓
[Token Caching]
  ├─ In-memory cache
  ├─ Keychain storage
  └─ File backup
  ↓
[API Request]
  ├─ Add auth header
  ├─ Make request
  └─ Handle response
  ↓
[Token Refresh] (if expired)
  ├─ Refresh token request
  ├─ Update storage
  └─ Retry request
```

### Settings Lifecycle

```
Application Start
  ↓
[Settings Loading]
  ├─ System defaults
  ├─ System settings
  ├─ User settings
  └─ Workspace settings
  ↓
[Migration Check]
  ├─ Detect V1 format
  ├─ Migrate to V2
  └─ Save migrated
  ↓
[Merge Cascade]
  ├─ Deep merge with strategy
  ├─ Resolve conflicts
  └─ Create final config
  ↓
[Runtime Updates]
  ├─ Slash commands (/model, /baseurl)
  ├─ Ephemeral settings
  └─ In-memory overlay
  ↓
[Settings Persistence]
  ├─ User action (save)
  ├─ Preserve comments
  ├─ Atomic write
  └─ Validation
  ↓
[Settings Reload]
  ├─ File watch (optional)
  ├─ Reload cascade
  └─ Apply changes
```

### Telemetry Data Flow

```
Application Event
  ↓
[Event Creation]
  ├─ Event type
  ├─ Attributes
  └─ Timestamp
  ↓
[Privacy Filter]
  ├─ Check telemetry settings
  ├─ Redact sensitive data
  └─ Apply consent rules
  ↓
[Metric Recording]
  ├─ Counter increment
  ├─ Histogram update
  └─ Gauge set
  ↓
[Log Emission]
  ├─ OpenTelemetry logger
  ├─ Structured attributes
  └─ Severity level
  ↓
[Export]
  ├─ OTLP endpoint (if configured)
  ├─ File export (if enabled)
  └─ Console output (debug)
  ↓
[Aggregation]
  ├─ Session summary
  ├─ Usage statistics
  └─ Error tracking
```

### Memory/Context Lifecycle

```
Session Start
  ↓
[Memory Discovery]
  ├─ Global memory (~/.alfred/memory.md)
  ├─ Project memory (.alfred/ALFRED.md)
  ├─ Include directories
  └─ Extension context files
  ↓
[Memory Loading]
  ├─ Read files
  ├─ Parse format (markdown/yaml)
  ├─ Validate structure
  └─ Merge content
  ↓
[Context Building]
  ├─ Environment context
  ├─ Directory structure
  ├─ Git information
  └─ User memory
  ↓
[System Prompt]
  ├─ Core instructions
  ├─ Tool descriptions
  ├─ Memory content
  └─ Context information
  ↓
[Runtime Updates]
  ├─ Memory tool writes
  ├─ Context additions
  └─ Dynamic updates
  ↓
[Memory Persistence]
  ├─ Save to files
  ├─ Update timestamps
  └─ Maintain history
```

---

**Key Data Flow Characteristics:**

1. **Provider Agnostic**: Central IContent model allows seamless provider switching
2. **Streaming First**: All data flows support streaming for real-time updates
3. **Validation Layers**: Multiple validation points ensure data integrity
4. **Caching Strategy**: Multi-level caching (memory, file, keychain) for performance
5. **Event-Driven**: EventEmitter pattern for state synchronization
6. **Atomic Operations**: File writes and state updates use atomic operations
7. **Error Recovery**: Comprehensive error handling with fallback mechanisms
8. **Privacy Aware**: Telemetry and logging respect user privacy settings
9. **Extensible**: Plugin architecture (MCP, extensions) for data source expansion
10. **Type Safe**: TypeScript ensures type safety throughout data transformations
