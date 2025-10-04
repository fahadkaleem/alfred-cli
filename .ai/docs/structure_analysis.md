# Code Structure Analysis

## Architectural Overview

Alfred CLI is a **terminal-based AI agent** that provides direct access to Google's Gemini models. The architecture follows a **monorepo structure** with a clear separation between the CLI frontend and the core backend logic, organized as a **modular, event-driven system** with strong emphasis on extensibility and tool-based capabilities.

### High-Level Architecture Pattern

- **Pattern**: Layered Architecture with Event-Driven Communication
- **Structure**: Monorepo with workspace packages (`packages/cli`, `packages/core`, `packages/test-utils`)
- **Communication**: Event-based messaging between UI and core, with streaming responses from LLM
- **Extension Model**: Plugin-based architecture supporting MCP (Model Context Protocol) servers and custom extensions

### Technology Stack

- **Runtime**: Node.js 20+ with ES Modules
- **Language**: TypeScript with strict type checking
- **UI Framework**: React + Ink (terminal UI rendering)
- **Build System**: esbuild for bundling, npm workspaces for monorepo management
- **Testing**: Vitest with comprehensive unit and integration tests
- **LLM Integration**: Google Gemini API via `@google/genai` SDK

### Key Architectural Principles

1. **Separation of Concerns**: CLI (presentation) vs Core (business logic)
2. **Modularity**: Tool-based extensibility with clear interfaces
3. **Type Safety**: Strict TypeScript with comprehensive type definitions
4. **Functional Programming**: Preference for plain objects over classes, immutable data patterns
5. **Event-Driven**: Asynchronous communication via EventEmitter patterns
6. **Provider Abstraction**: Multi-provider support (Gemini, Anthropic, OpenAI) through unified interfaces

---

## Core Components

### 1. **CLI Package** (`packages/cli`)

**Responsibility**: User-facing terminal interface, input/output handling, UI rendering

**Key Modules**:

- **`src/gemini.tsx`**: Main entry point, application initialization, authentication flow
- **`src/ui/App.tsx`**: Root React component, layout management (screen reader vs default)
- **`src/ui/AppContainer.tsx`**: Application container with context providers
- **`src/ui/components/`**: Reusable UI components (Composer, InputPrompt, Footer, etc.)
- **`src/ui/contexts/`**: React contexts for state management (Session, Settings, Theme, Keypress, etc.)
- **`src/ui/hooks/`**: Custom React hooks for business logic (useGeminiStream, useHistoryManager, etc.)
- **`src/config/`**: Configuration management (settings, auth, extensions, key bindings)
- **`src/commands/`**: Slash command implementations (extensions, mcp)
- **`src/services/`**: Command loading and processing services

**Design Patterns**:

- **Context Provider Pattern**: Centralized state management via React contexts
- **Custom Hooks Pattern**: Encapsulation of complex stateful logic
- **Component Composition**: Small, focused components composed into layouts
- **Event-Driven UI**: Keypress handling, streaming updates, tool confirmations

### 2. **Core Package** (`packages/core`)

**Responsibility**: Backend logic, LLM interaction, tool execution, state management

**Key Modules**:

- **`src/core/client.ts`**: `GeminiClient` - main orchestrator for LLM interactions
- **`src/core/alfredChat.ts`**: `AlfredChat` - manages conversation state and streaming
- **`src/core/turn.ts`**: `Turn` - represents a single conversation turn with events
- **`src/core/contentGenerator.ts`**: Abstract interface for LLM content generation
- **`src/core/prompts.ts`**: System prompt construction and management
- **`src/providers/`**: Multi-provider abstraction layer
  - **`ProviderManager.ts`**: Manages multiple LLM providers
  - **`IProvider.ts`**: Provider interface contract
  - **`anthropic/`, `gemini/`, `openai/`**: Provider implementations
- **`src/tools/`**: Tool implementations (file operations, shell, web, memory, MCP)
- **`src/services/`**: Core services (file discovery, git, shell execution, history)
- **`src/agents/`**: Subagent execution framework
- **`src/mcp/`**: MCP (Model Context Protocol) integration
- **`src/telemetry/`**: Observability and metrics collection
- **`src/config/`**: Core configuration and model definitions
- **`src/confirmation-bus/`**: Message bus for tool confirmation flow

**Design Patterns**:

- **Strategy Pattern**: Provider abstraction for different LLM backends
- **Factory Pattern**: Tool registry and tool creation
- **Observer Pattern**: Event-driven turn processing
- **Template Method**: Base classes for tools and providers
- **Decorator Pattern**: LoggingProviderWrapper for telemetry

### 3. **Tool System** (`packages/core/src/tools/`)

**Responsibility**: Extensible capabilities for LLM to interact with environment

**Core Tool Abstractions**:

- **`tools.ts`**: Base interfaces (`ToolInvocation`, `BaseDeclarativeTool`)
- **`tool-registry.ts`**: `ToolRegistry` - manages tool registration and discovery
- **`tool-error.ts`**: Standardized error handling for tools

**Built-in Tools**:

- **File Operations**: `read-file.ts`, `write-file.ts`, `edit.ts`, `read-many-files.ts`
- **File Discovery**: `ls.ts`, `glob.ts`, `grep.ts`, `ripGrep.ts`
- **Shell Execution**: `shell.ts` (with confirmation flow)
- **Web Access**: `web-fetch.ts`, `web-search.ts`
- **Memory Management**: `memoryTool.ts`, `write-todos.ts`
- **MCP Integration**: `mcp-tool.ts`, `mcp-client.ts`, `mcp-client-manager.ts`

**Tool Lifecycle**:

1. **Registration**: Tools register with `ToolRegistry` via `registerTool()`
2. **Discovery**: LLM receives tool schemas via `getFunctionDeclarations()`
3. **Invocation**: LLM requests tool via function call
4. **Validation**: Parameters validated against schema
5. **Confirmation**: User confirms if tool requires approval (via MessageBus)
6. **Execution**: Tool executes with abort signal support
7. **Result**: Result returned to LLM for next turn

---

## Service Definitions

### Core Services (`packages/core/src/services/`)

#### **FileDiscoveryService**

- **Purpose**: Discovers and indexes files in workspace
- **Key Methods**: `discoverFiles()`, `getFileList()`, `shouldIncludeFile()`
- **Integration**: Used by memory tools and context building

#### **GitService**

- **Purpose**: Git repository operations and status
- **Key Methods**: `getStatus()`, `getBranchName()`, `getRemoteUrl()`
- **Integration**: Provides git context to LLM

#### **ShellExecutionService**

- **Purpose**: Executes shell commands with safety checks
- **Key Methods**: `executeCommand()`, `validateCommand()`
- **Features**: Output streaming, timeout handling, encoding detection
- **Integration**: Used by ShellTool with confirmation flow

#### **ChatRecordingService**

- **Purpose**: Records conversation history to disk
- **Key Methods**: `recordTurn()`, `loadHistory()`
- **Integration**: Enables conversation checkpointing and resume

#### **FileSystemService**

- **Purpose**: File system operations with safety checks
- **Key Methods**: `readFile()`, `writeFile()`, `fileExists()`
- **Integration**: Used by file operation tools

#### **HistoryService** (`packages/core/src/services/history/`)

- **Purpose**: Provider-agnostic conversation history management
- **Key Features**:
  - Token counting and tracking
  - Compression support (orphaned tool call detection)
  - Content format conversion (IContent abstraction)
  - Event emission for token updates
- **Key Methods**: `addMessage()`, `getHistory()`, `compress()`, `getTotalTokens()`

### UI Services (`packages/cli/src/services/`)

#### **CommandService**

- **Purpose**: Manages slash command registration and execution
- **Key Methods**: `registerCommand()`, `executeCommand()`, `getCompletions()`
- **Loaders**: `BuiltinCommandLoader`, `FileCommandLoader`, `McpPromptLoader`

---

## Interface Contracts

### Provider System Interfaces

#### **IProvider** (`packages/core/src/providers/IProvider.ts`)

```typescript
interface IProvider {
  name: string;
  generateContent(
    request: GenerateContentRequest,
  ): Promise<GenerateContentResponse>;
  generateContentStream(
    request: GenerateContentRequest,
  ): AsyncGenerator<StreamChunk>;
  getAvailableModels(): Promise<IModel[]>;
  setModel(modelName: string): void;
  getTokenizer(): ITokenizer;
}
```

#### **IProviderManager** (`packages/core/src/providers/IProviderManager.ts`)

```typescript
interface IProviderManager {
  registerProvider(provider: IProvider): void;
  getActiveProvider(): IProvider;
  setActiveProvider(name: string): void;
  getAvailableModels(): Promise<IModel[]>;
  switchProvider(name: string, model?: string): void;
}
```

### Tool System Interfaces

#### **ToolInvocation** (`packages/core/src/tools/tools.ts`)

```typescript
interface ToolInvocation<TParams, TResult> {
  params: TParams;
  getDescription(): string;
  toolLocations(): ToolLocation[];
  shouldConfirmExecute(
    signal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false>;
  execute(
    signal: AbortSignal,
    updateOutput?: (output: string) => void,
  ): Promise<TResult>;
}
```

#### **BaseDeclarativeTool** (`packages/core/src/tools/tools.ts`)

```typescript
abstract class BaseDeclarativeTool<TParams, TResult> {
  abstract name: string;
  abstract description: string;
  abstract parameters: JSONSchema;
  abstract build(
    params: TParams,
    messageBus?: MessageBus,
  ): ToolInvocation<TParams, TResult>;
  getFunctionDeclaration(): FunctionDeclaration;
}
```

### Configuration Interfaces

#### **Config** (`packages/core/src/config/config.ts`)

- Central configuration object passed throughout the application
- Methods for accessing settings, tools, authentication, telemetry
- Immutable configuration with getter methods

#### **LoadedSettings** (`packages/cli/src/config/settings.ts`)

- Hierarchical settings (global, workspace, ephemeral)
- Merged settings with precedence rules
- Type-safe settings schema

### Event Interfaces

#### **ServerGeminiStreamEvent** (`packages/core/src/core/turn.ts`)

- Union type for all streaming events from LLM
- Event types: `content`, `thinking`, `finished`, `error`, `compressed`, etc.
- Enables reactive UI updates

#### **Message Bus Types** (`packages/core/src/confirmation-bus/types.ts`)

- `ToolConfirmationRequest`: Request user confirmation for tool execution
- `ToolConfirmationResponse`: User's confirmation decision
- `ToolPolicyRejection`: Policy engine rejected tool execution

---

## Design Patterns Identified

### 1. **Layered Architecture**

- **Presentation Layer**: CLI package (React/Ink UI)
- **Business Logic Layer**: Core package (LLM orchestration, tool execution)
- **Data Access Layer**: Services (file system, git, history)

### 2. **Provider Pattern (Strategy)**

- Multiple LLM providers (Gemini, Anthropic, OpenAI) with unified interface
- Runtime provider switching via `ProviderManager`
- Provider-specific implementations hidden behind `IProvider` interface

### 3. **Plugin Architecture**

- **MCP Servers**: External tool providers via Model Context Protocol
- **Extensions**: User-defined commands and context files
- **Tool Registry**: Dynamic tool registration and discovery

### 4. **Event-Driven Architecture**

- **Streaming Events**: LLM responses streamed as events (`ServerGeminiStreamEvent`)
- **UI Events**: Keypress, focus, state changes via React contexts
- **Tool Events**: Confirmation requests/responses via MessageBus
- **Telemetry Events**: Observability via OpenTelemetry

### 5. **Repository Pattern**

- `ToolRegistry`: Manages tool instances
- `ProviderManager`: Manages provider instances
- `CommandService`: Manages command instances

### 6. **Decorator Pattern**

- `LoggingProviderWrapper`: Adds telemetry to any provider
- `LoggingContentGenerator`: Adds logging to content generation

### 7. **Template Method Pattern**

- `BaseDeclarativeTool`: Defines tool lifecycle, subclasses implement specifics
- `BaseToolInvocation`: Common confirmation logic, subclasses implement execution

### 8. **Observer Pattern**

- React contexts for state propagation
- EventEmitter for service events (HistoryService, MessageBus)
- Streaming responses via AsyncGenerator

### 9. **Factory Pattern**

- Tool creation via `build()` method
- Provider instantiation in `ProviderManager`
- Command loading via loader services

### 10. **Facade Pattern**

- `GeminiClient`: Simplifies complex LLM interaction
- `Config`: Unified access to all configuration

### 11. **Singleton Pattern**

- `uiTelemetryService`: Global telemetry instance
- `sessionId`: Global session identifier
- `settingsServiceInstance`: Global settings service

---

## Component Relationships

### High-Level Data Flow

```
User Input (Terminal)
  ↓
CLI Package (React/Ink UI)
  ↓ (via hooks: useGeminiStream)
Core Package (GeminiClient)
  ↓ (via AlfredChat)
Provider (Gemini/Anthropic/OpenAI)
  ↓ (streaming events)
Tool Execution (if requested)
  ↓ (via MessageBus for confirmation)
User Confirmation (if needed)
  ↓
Tool Result
  ↓
Provider (next turn)
  ↓
CLI Package (display response)
  ↓
User (terminal output)
```

### Key Relationships

#### **CLI ↔ Core Communication**

- **CLI → Core**: User prompts, tool confirmations, configuration
- **Core → CLI**: Streaming events, tool requests, errors
- **Mechanism**: Async generators, event callbacks, React state updates

#### **Core ↔ Provider Communication**

- **Core → Provider**: Generate content requests with tools and history
- **Provider → Core**: Streaming responses, token usage, errors
- **Mechanism**: `IProvider` interface, async generators

#### **Core ↔ Tool Communication**

- **Core → Tool**: Tool invocation with validated parameters
- **Tool → Core**: Execution results, progress updates, errors
- **Mechanism**: `ToolInvocation` interface, abort signals

#### **UI ↔ MessageBus Communication**

- **Tool → MessageBus**: Confirmation request
- **MessageBus → UI**: Confirmation request (if policy allows)
- **UI → MessageBus**: User decision
- **MessageBus → Tool**: Confirmation response
- **Mechanism**: EventEmitter pub/sub pattern

#### **Component Dependencies**

- **GeminiClient** depends on: `Config`, `AlfredChat`, `ToolRegistry`, `LoopDetectionService`
- **AlfredChat** depends on: `ContentGenerator`, `ToolRegistry`, `HistoryService`
- **ToolRegistry** depends on: `Config`, individual tool implementations
- **ProviderManager** depends on: `IProvider` implementations, `Config`
- **UI Components** depend on: React contexts, custom hooks, core types

---

## Key Methods & Functions

### Core Orchestration

#### **GeminiClient.sendMessage()** (`packages/core/src/core/client.ts`)

- **Purpose**: Main entry point for sending user prompts to LLM
- **Flow**:
  1. Validate input and check loop detection
  2. Construct prompt with system instructions and tools
  3. Stream response from provider
  4. Handle tool calls (request confirmation, execute, send results)
  5. Emit events for UI updates
  6. Handle compression if token limit exceeded
- **Returns**: AsyncGenerator of `ServerGeminiStreamEvent`

#### **AlfredChat.sendMessageStream()** (`packages/core/src/core/alfredChat.ts`)

- **Purpose**: Manages conversation state and streaming
- **Responsibilities**:
  - Maintains conversation history
  - Handles tool call lifecycle
  - Manages thinking mode
  - Emits structured events
- **Returns**: AsyncGenerator of streaming events

#### **Turn.processStream()** (`packages/core/src/core/turn.ts`)

- **Purpose**: Processes raw LLM stream into structured events
- **Responsibilities**:
  - Parses streaming chunks
  - Detects tool calls
  - Handles thinking blocks
  - Manages turn state
- **Returns**: AsyncGenerator of `ServerGeminiStreamEvent`

### Tool Execution

#### **ToolRegistry.executeTool()** (`packages/core/src/tools/tool-registry.ts`)

- **Purpose**: Executes a tool by name with parameters
- **Flow**:
  1. Lookup tool by name
  2. Validate parameters against schema
  3. Build tool invocation
  4. Check if confirmation needed
  5. Execute tool with abort signal
  6. Return result or error
- **Returns**: Promise of `ToolResult`

#### **BaseToolInvocation.execute()** (`packages/core/src/tools/tools.ts`)

- **Purpose**: Abstract method for tool execution
- **Subclass Responsibilities**:
  - Implement actual tool logic
  - Handle errors gracefully
  - Support abort signals
  - Stream output if applicable
- **Returns**: Promise of tool-specific result

### UI Hooks

#### **useGeminiStream()** (`packages/cli/src/ui/hooks/useGeminiStream.ts`)

- **Purpose**: Manages LLM streaming in React UI
- **Responsibilities**:
  - Handles user input submission
  - Processes streaming events
  - Manages tool call UI state
  - Handles errors and cancellation
  - Updates history
- **Returns**: Object with `submitPrompt`, `cancelRequest`, streaming state

#### **useHistoryManager()** (`packages/cli/src/ui/hooks/useHistoryManager.ts`)

- **Purpose**: Manages conversation history in UI
- **Responsibilities**:
  - Adds/removes history items
  - Handles compression
  - Persists to disk
  - Loads saved conversations
- **Returns**: Object with `addItem`, `clear`, `loadHistory`, `history`

#### **useReactToolScheduler()** (`packages/cli/src/ui/hooks/useReactToolScheduler.ts`)

- **Purpose**: Manages tool call lifecycle in React
- **Responsibilities**:
  - Tracks tool call state (waiting, executing, completed, cancelled)
  - Handles tool confirmations
  - Updates UI for tool progress
  - Manages tool groups
- **Returns**: Object with tool state and control functions

### Provider Methods

#### **ProviderManager.switchProvider()** (`packages/core/src/providers/ProviderManager.ts`)

- **Purpose**: Switches active LLM provider
- **Flow**:
  1. Validate provider exists
  2. Set active provider
  3. Optionally set model
  4. Log telemetry event
  5. Update token tracking
- **Side Effects**: Changes active provider for all subsequent requests

#### **LoggingProviderWrapper.generateContentStream()** (`packages/core/src/providers/LoggingProviderWrapper.ts`)

- **Purpose**: Wraps provider with telemetry
- **Responsibilities**:
  - Logs API requests/responses
  - Tracks token usage
  - Records errors
  - Measures latency
- **Returns**: AsyncGenerator with telemetry

### Configuration

#### **loadCliConfig()** (`packages/cli/src/config/config.ts`)

- **Purpose**: Loads and merges all configuration sources
- **Sources**:
  1. Command-line arguments
  2. Environment variables
  3. Settings files (global, workspace)
  4. Extensions
  5. MCP servers
- **Returns**: Promise of `Config` object

#### **loadSettings()** (`packages/cli/src/config/settings.ts`)

- **Purpose**: Loads hierarchical settings
- **Hierarchy**: Global → Workspace → Ephemeral
- **Returns**: Promise of `LoadedSettings` with merged configuration

---

## Available Documentation

### Documentation Locations

#### **Primary Documentation** (`/docs/`)

- **`architecture.md`**: High-level architecture overview (AVAILABLE, GOOD QUALITY)
- **`index.md`**: Main documentation index
- **`getting-started-extensions.md`**: Extension development guide
- **`troubleshooting.md`**: Common issues and solutions
- **`keyboard-shortcuts.md`**: UI keyboard shortcuts
- **`telemetry.md`**: Telemetry and privacy information
- **`sandbox.md`**: Sandboxing and security
- **`checkpointing.md`**: Conversation checkpointing
- **`deployment.md`**: Deployment and distribution
- **`integration-tests.md`**: Integration testing guide

#### **CLI Documentation** (`/docs/cli/`)

- **`authentication.md`**: Authentication methods and setup
- **`commands.md`**: Slash command reference
- **`configuration.md`**: Configuration file format
- **`themes.md`**: Theme customization
- **`tutorials.md`**: Step-by-step tutorials
- **`token-caching.md`**: Token caching mechanisms

#### **Core Documentation** (`/docs/core/`)

- **`index.md`**: Core package overview
- **`tools-api.md`**: Tool development API
- **`memport.md`**: Memory management

#### **Tools Documentation** (`/docs/tools/`)

- **`file-system.md`**: File operation tools
- **`shell.md`**: Shell execution tool
- **`web-fetch.md`**: Web fetching tool
- **`web-search.md`**: Web search tool
- **`memory.md`**: Memory tools
- **`mcp-server.md`**: MCP server integration
- **`multi-file.md`**: Multi-file operations

#### **Project Documentation** (`/`)

- **`README.md`**: Project overview, installation, quick start (EXCELLENT QUALITY)
- **`ALFRED.md`**: Contributing guidelines, coding standards (EXCELLENT QUALITY)
- **`CLAUDE.md`**: Claude-specific documentation
- **`LICENSE`**: Apache 2.0 license
- **`package.json`**: Project metadata and scripts

### Documentation Quality Assessment

**Excellent Quality**:

- `README.md`: Comprehensive, well-structured, covers installation, features, authentication
- `ALFRED.md`: Detailed contributing guide with testing, React, TypeScript best practices
- `docs/architecture.md`: Clear architectural overview with component descriptions

**Good Quality**:

- CLI documentation: Covers most user-facing features
- Tools documentation: Explains individual tool capabilities
- Configuration documentation: Details settings and options

**Areas for Improvement**:

- **Provider System**: Limited documentation on multi-provider architecture
- **Agent System**: Subagent framework not well documented
- **Message Bus**: Confirmation flow architecture needs more detail
- **History Service**: Provider-agnostic history management not documented
- **Telemetry**: OpenTelemetry integration details sparse
- **Extension API**: Extension development could be more comprehensive

### Documentation Gaps

1. **Provider abstraction layer**: How to add new providers
2. **Tool development**: Comprehensive guide for custom tools
3. **Agent framework**: How to create and use subagents
4. **Message bus**: Confirmation flow architecture and usage
5. **History service**: Token tracking and compression algorithms
6. **Testing strategies**: More examples of testing patterns
7. **Performance optimization**: Best practices for large codebases
8. **Security model**: Detailed security architecture and threat model

---

## Summary

Alfred CLI is a **well-architected, modular terminal-based AI agent** with clear separation of concerns between UI (CLI package) and business logic (Core package). The architecture emphasizes:

1. **Extensibility**: Plugin-based tool system, MCP integration, extension support
2. **Type Safety**: Comprehensive TypeScript with strict checking
3. **Modularity**: Clear interfaces, dependency injection, service-oriented design
4. **Event-Driven**: Streaming responses, reactive UI, message bus for confirmations
5. **Multi-Provider**: Abstraction layer supporting multiple LLM backends
6. **User Experience**: Rich terminal UI with React/Ink, keyboard shortcuts, themes

The codebase follows modern JavaScript/TypeScript best practices with functional programming patterns, immutable data structures, and comprehensive testing. The documentation is generally good but could benefit from more detailed coverage of advanced features like the provider system, agent framework, and message bus architecture.

**Key Strengths**:

- Clean separation between presentation and business logic
- Comprehensive tool system with safety checks
- Multi-provider support with unified interface
- Rich terminal UI with accessibility support
- Extensive configuration and customization options

**Areas for Enhancement**:

- More documentation on advanced features
- Clearer examples for extension development
- Better documentation of internal architecture (providers, agents, message bus)
- Performance optimization guides for large codebases
