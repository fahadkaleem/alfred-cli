# Dependency Analysis

## Internal Dependencies Map

### Package Structure

The Alfred CLI project is organized as a monorepo with the following internal package structure:

```
@alfred/alfred-cli (root)
├── @alfred/alfred-cli (packages/cli) - CLI frontend
├── @alfred/alfred-cli-core (packages/core) - Core backend logic
└── @alfred/alfred-cli-test-utils (packages/test-utils) - Shared test utilities
```

### Internal Package Dependencies

**packages/cli** depends on:

- `@alfred/alfred-cli-core` (file:../core) - Core functionality
- `@alfred/alfred-cli-test-utils` (file:../test-utils) - Test utilities (dev)

**packages/core** depends on:

- `@alfred/alfred-cli-test-utils` (file:../test-utils) - Test utilities (dev)

**packages/test-utils** has no internal dependencies (leaf package)

### Module Dependency Graph

#### Core Package (packages/core)

**Core Modules:**

- `config/` - Configuration management (Config, Storage, models)
- `core/` - Main chat logic (AlfredChat, GeminiClient, BaseLlmClient, Turn, ContentGenerator)
- `providers/` - Provider abstraction layer (ProviderManager, AnthropicProvider, GeminiProvider)
- `tools/` - Tool system (ToolRegistry, individual tools)
- `services/` - Business logic services (FileSystemService, GitService, ShellExecutionService, HistoryService)
- `agents/` - Agent system (AgentRegistry, CodebaseInvestigatorAgent)
- `mcp/` - MCP protocol support (MCPOAuthProvider, token storage)
- `telemetry/` - Observability (metrics, logging, activity tracking)
- `routing/` - Model routing (ModelRouterService, routing strategies)
- `auth/` - Authentication (AuthPrecedenceResolver, token management)
- `utils/` - Shared utilities
- `settings/` - Settings management (SettingsService)

**Key Internal Dependencies:**

- `core/client.ts` depends on: config, providers, tools, services, telemetry
- `providers/ProviderManager.ts` depends on: providers, config, telemetry, settings
- `tools/tool-registry.ts` depends on: config, tools, mcp
- `services/history/HistoryService.ts` depends on: providers/tokenizers, debug
- `agents/registry.ts` depends on: config, agents
- `routing/modelRouterService.ts` depends on: config, strategies, telemetry

#### CLI Package (packages/cli)

**Core Modules:**

- `ui/` - React-based UI components and contexts
- `config/` - CLI-specific configuration (auth, settings, extensions, policy)
- `services/` - Command and prompt services
- `commands/` - Extension and MCP commands
- `core/` - CLI initialization logic
- `utils/` - CLI utilities

**Key Internal Dependencies:**

- `gemini.tsx` depends on: ui, config, core, utils, @alfred/alfred-cli-core
- `ui/App.tsx` depends on: contexts, layouts, hooks
- `ui/hooks/useGeminiStream.ts` depends on: @alfred/alfred-cli-core, contexts, utils
- `config/extension.ts` depends on: @alfred/alfred-cli-core, settings, utils
- `services/CommandService.ts` depends on: types, loaders

### Cross-Package Dependencies

**CLI → Core:**

- CLI imports extensively from core for: Config, GeminiClient, tools, telemetry, services
- Main integration point: `packages/cli/src/gemini.tsx` initializes core components
- UI hooks consume core events and types

**Test Utils → Core/CLI:**

- Provides mock implementations and test helpers
- Used by both packages for testing

## External Libraries Analysis

### Core Runtime Dependencies (packages/core)

**AI/ML Libraries:**

- `@anthropic-ai/sdk` (^0.65.0) - Anthropic Claude API client
- `@google/genai` (1.16.0) - Google Gemini API client
- `@dqbd/tiktoken` (^1.0.22) - Token counting for OpenAI models

**MCP Protocol:**

- `@modelcontextprotocol/sdk` (^1.11.0) - Model Context Protocol implementation

**Telemetry & Observability:**

- `@opentelemetry/api` (^1.9.0) - OpenTelemetry API
- `@opentelemetry/sdk-node` (^0.203.0) - OpenTelemetry SDK
- `@opentelemetry/instrumentation-http` (^0.203.0) - HTTP instrumentation
- `@google-cloud/opentelemetry-cloud-monitoring-exporter` (^0.21.0) - GCP monitoring
- `@google-cloud/opentelemetry-cloud-trace-exporter` (^3.0.0) - GCP tracing
- `@google-cloud/logging` (^11.2.1) - GCP logging

**Authentication:**

- `google-auth-library` (^9.11.0) - Google OAuth and service account auth

**File System & Search:**

- `@joshua.litt/get-ripgrep` (^0.0.2) - Ripgrep binary management
- `fdir` (^6.4.6) - Fast directory traversal
- `glob` (^10.4.5) - File pattern matching
- `ignore` (^7.0.0) - .gitignore parsing
- `picomatch` (^4.0.1) - Fast glob matching

**Terminal & Shell:**

- `@xterm/headless` (5.5.0) - Headless terminal emulator
- `@lydell/node-pty` (1.1.0) - PTY bindings (optional)
- `shell-quote` (^1.8.3) - Shell command parsing

**Utilities:**

- `ajv` (^8.17.1) - JSON schema validation
- `ajv-formats` (^3.0.0) - Additional validation formats
- `diff` (^7.0.0) - Text diffing
- `fast-levenshtein` (^2.0.6) - String distance
- `marked` (^15.0.12) - Markdown parsing
- `html-to-text` (^9.0.5) - HTML to text conversion
- `mime` (4.0.7) - MIME type detection
- `undici` (^7.10.0) - HTTP client
- `ws` (^8.18.0) - WebSocket client

### CLI Runtime Dependencies (packages/cli)

**UI Framework:**

- `react` (^19.1.0) - UI framework
- `ink` (^6.2.3) - React for CLIs
- `ink-spinner` (^5.0.0) - Loading spinners
- `ink-big-text` (^2.0.0) - Large text rendering
- `ink-gradient` (^3.0.0) - Gradient text

**Syntax Highlighting:**

- `highlight.js` (^11.11.1) - Code highlighting
- `lowlight` (^3.3.0) - Highlight.js wrapper

**CLI Utilities:**

- `yargs` (^17.7.2) - Argument parsing
- `command-exists` (^1.2.9) - Command availability check
- `update-notifier` (^7.3.1) - Update notifications
- `fzf` (^0.5.2) - Fuzzy finder

**Configuration:**

- `@iarna/toml` (^2.2.5) - TOML parsing
- `comment-json` (^4.2.5) - JSON with comments
- `dotenv` (^17.1.0) - Environment variables
- `zod` (^3.23.8) - Schema validation

**Text Processing:**

- `ansi-regex` (^6.2.2) - ANSI code detection
- `strip-ansi` (^7.1.0) - ANSI code removal
- `string-width` (^7.1.0) - String width calculation
- `wrap-ansi` (9.0.2) - Text wrapping

### Development Dependencies

**Build Tools:**

- `esbuild` (^0.25.0) - Fast bundler
- `typescript` (^5.3.3) - Type system
- `tsx` (^4.20.3) - TypeScript execution

**Testing:**

- `vitest` (^3.2.4) - Test runner
- `@vitest/coverage-v8` (^3.1.1) - Coverage
- `msw` (^2.10.4) - API mocking
- `mock-fs` (^5.5.0) - File system mocking
- `@testing-library/react` (^16.3.0) - React testing
- `ink-testing-library` (^4.0.0) - Ink testing

**Linting & Formatting:**

- `eslint` (^9.24.0) - Linting
- `typescript-eslint` (^8.30.1) - TypeScript linting
- `prettier` (^3.5.3) - Code formatting
- `husky` (^9.1.7) - Git hooks
- `lint-staged` (^16.1.6) - Staged file linting

### Version Pinning Strategy

**Exact Versions:**

- `@google/genai` (1.16.0) - Pinned for API stability
- `@xterm/headless` (5.5.0) - Pinned for compatibility
- `mime` (4.0.7) - Pinned for stability
- `wrap-ansi` (9.0.2) - Pinned to avoid breaking changes

**Caret Ranges (^):**

- Most dependencies use caret ranges for minor/patch updates
- Allows automatic security and bug fixes

**Optional Dependencies:**

- `@lydell/node-pty` family - Platform-specific PTY bindings
- `node-pty` - Fallback PTY implementation

## Service Integrations

### Google Cloud Platform (GCP)

**Gemini API:**

- Primary LLM provider via `@google/genai`
- Authentication: API key, OAuth, service account
- Models: gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash-exp
- Features: Grounding, thinking mode, multimodal input

**Google Search Grounding:**

- Integrated via Gemini API
- Provides real-time web search capabilities

**Cloud Telemetry:**

- Cloud Monitoring via `@google-cloud/opentelemetry-cloud-monitoring-exporter`
- Cloud Trace via `@google-cloud/opentelemetry-cloud-trace-exporter`
- Cloud Logging via `@google-cloud/logging`

**Authentication:**

- OAuth 2.0 via `google-auth-library`
- Service account impersonation
- API key authentication

### Anthropic

**Claude API:**

- Secondary LLM provider via `@anthropic-ai/sdk`
- Authentication: API key, OAuth device flow
- Models: claude-3-5-sonnet, claude-3-opus
- Provider abstraction via `AnthropicProvider`

### Model Context Protocol (MCP)

**MCP Servers:**

- Client implementation via `@modelcontextprotocol/sdk`
- Supports stdio and SSE transports
- OAuth authentication for MCP servers
- Tool and prompt discovery
- Managed by `McpClientManager`

### OpenTelemetry

**Observability:**

- Metrics, traces, and logs via OpenTelemetry SDK
- OTLP exporters (gRPC and HTTP)
- HTTP instrumentation
- GCP resource detection
- Local and cloud telemetry targets

### GitHub

**Extension Management:**

- Git repository cloning for extensions
- GitHub release downloads
- Version tracking and updates

### Terminal Integration

**PTY Support:**

- Platform-specific PTY bindings via `@lydell/node-pty`
- Fallback to `node-pty`
- Shell command execution via `ShellExecutionService`

**Terminal Emulation:**

- Headless terminal via `@xterm/headless`
- ANSI escape sequence handling

## Dependency Injection Patterns

### Configuration-Based DI

**Config Class:**

- Central configuration object passed throughout the system
- Acts as a service locator and dependency container
- Provides access to: settings, tools, services, clients

**Example:**

```typescript
// packages/core/src/config/config.ts
export class Config {
  private toolRegistry: ToolRegistry;
  private promptRegistry: PromptRegistry;
  private fileSystemService: FileSystemService;
  private gitService: GitService;
  // ... many more services

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }
  getFileSystemService(): FileSystemService {
    return this.fileSystemService;
  }
  // ... getters for all services
}
```

### Constructor Injection

**ProviderManager:**

```typescript
// packages/core/src/providers/ProviderManager.ts
export class ProviderManager implements IProviderManager {
  constructor() {
    this.providers = new Map<string, IProvider>();
  }

  setConfig(config: Config): void {
    this.config = config;
    this.updateProviderWrapping();
  }
}
```

**HistoryService:**

```typescript
// packages/core/src/services/history/HistoryService.ts
export class HistoryService extends EventEmitter {
  private tokenizerCache = new Map<string, ITokenizer>();

  private getTokenizerForModel(modelName: string): ITokenizer {
    // Lazy initialization of tokenizers
  }
}
```

### Factory Pattern

**Content Generator Factory:**

```typescript
// packages/core/src/core/contentGenerator.ts
export function createContentGenerator(
  config: ContentGeneratorConfig,
): ContentGenerator {
  // Factory creates appropriate content generator
}
```

**Tool Creation:**

```typescript
// packages/core/src/tools/tool-registry.ts
export class ToolRegistry {
  registerTool(tool: AnyDeclarativeTool): void {
    // Dynamic tool registration
  }
}
```

### Singleton Pattern

**SettingsService:**

```typescript
// packages/core/src/settings/settingsServiceInstance.ts
let settingsServiceInstance: SettingsService | null = null;

export function getSettingsService(): SettingsService {
  if (!settingsServiceInstance) {
    settingsServiceInstance = new SettingsService();
  }
  return settingsServiceInstance;
}
```

**UITelemetryService:**

```typescript
// packages/core/src/telemetry/uiTelemetry.ts
export const uiTelemetryService = new UITelemetryService();
```

### Context-Based DI (React)

**React Contexts:**

- `SessionContext` - Session state and metrics
- `SettingsContext` - User settings
- `ThemeContext` - UI theme
- `KeypressContext` - Keyboard input
- `StreamingContext` - Streaming state
- `VimModeContext` - Vim mode state

**Example:**

```typescript
// packages/cli/src/ui/contexts/SessionContext.tsx
export const SessionStatsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [metrics, setMetrics] = useState<SessionMetrics>(initialMetrics);
  // ... context provider implementation
};
```

### Event-Based DI

**EventEmitter Pattern:**

- `HistoryService` extends EventEmitter for token updates
- `MessageBus` for confirmation requests
- `appEvents` for application-wide events

**Example:**

```typescript
// packages/core/src/services/history/HistoryService.ts
export class HistoryService extends EventEmitter {
  emit(event: 'tokensUpdated', eventData: TokensUpdatedEvent): boolean;
}
```

### Lazy Initialization

**MCP Client Manager:**

```typescript
// packages/core/src/tools/mcp-client-manager.ts
export class McpClientManager {
  async discoverAllMcpTools(cliConfig: Config): Promise<void> {
    // Lazy initialization of MCP clients
    const client = new McpClient(/* ... */);
    await client.connect();
    await client.discover(cliConfig);
  }
}
```

**Agent Registry:**

```typescript
// packages/core/src/agents/registry.ts
export class AgentRegistry {
  async initialize(): Promise<void> {
    this.loadBuiltInAgents();
  }
}
```

## Module Coupling Assessment

### High Cohesion Areas

**Core Package:**

- `core/` module - Tightly coupled chat logic (appropriate)
- `providers/` module - Well-abstracted provider system
- `tools/` module - Loosely coupled tool implementations
- `services/` module - Independent service implementations

**CLI Package:**

- `ui/` module - React components with clear boundaries
- `config/` module - Configuration management
- `services/` module - Command and prompt services

### Coupling Issues

**Config Class God Object:**

- `Config` class has too many responsibilities
- Acts as service locator, configuration store, and dependency container
- Violates Single Responsibility Principle
- **Impact:** High coupling throughout the system
- **Recommendation:** Split into ConfigStore, ServiceRegistry, and DependencyContainer

**Circular Dependencies:**

- `core/client.ts` ↔ `config/config.ts`
- `providers/ProviderManager.ts` ↔ `config/config.ts`
- **Impact:** Makes testing difficult, increases build complexity
- **Recommendation:** Introduce interfaces and dependency inversion

**Tight Coupling to Google APIs:**

- Direct dependency on `@google/genai` types throughout core
- Makes provider abstraction leaky
- **Impact:** Difficult to add new providers
- **Recommendation:** Create internal type abstractions

**Settings Service Singleton:**

- Global singleton pattern for `SettingsService`
- Makes testing difficult
- **Impact:** Hard to test in isolation
- **Recommendation:** Use dependency injection instead

### Decoupling Opportunities

**Provider Abstraction:**

- Current: Providers implement `IProvider` but leak implementation details
- Opportunity: Strengthen abstraction with internal types
- Benefit: Easier to add new LLM providers

**Tool System:**

- Current: Tools are well-decoupled
- Opportunity: Extract tool execution into separate service
- Benefit: Better testability and reusability

**UI Components:**

- Current: Some components directly import from core
- Opportunity: Use context and props exclusively
- Benefit: Better component isolation

**Telemetry:**

- Current: Telemetry calls scattered throughout codebase
- Opportunity: Use aspect-oriented programming or decorators
- Benefit: Cleaner separation of concerns

**Authentication:**

- Current: Auth logic mixed with provider implementations
- Opportunity: Extract to dedicated auth service
- Benefit: Centralized auth management

## Dependency Graph

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Package                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │    UI    │  │  Config  │  │ Services │  │ Commands │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       └─────────────┴──────────────┴─────────────┘          │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        Core Package                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Core   │  │Providers │  │  Tools   │  │ Services │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐   │
│  │  Config  │  │   MCP    │  │  Agents  │  │Telemetry │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Dependencies                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Gemini  │  │Anthropic │  │   MCP    │  │   OTel   │   │
│  │   API    │  │   API    │  │  Servers │  │   APIs   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Core Module Dependencies

```
Config
  ├─→ ToolRegistry
  ├─→ PromptRegistry
  ├─→ ProviderManager
  ├─→ FileSystemService
  ├─→ GitService
  ├─→ ShellExecutionService
  ├─→ HistoryService
  ├─→ AgentRegistry
  ├─→ McpClientManager
  └─→ ModelRouterService

GeminiClient
  ├─→ Config
  ├─→ ProviderManager
  ├─→ ToolRegistry
  ├─→ HistoryService
  └─→ Telemetry

ProviderManager
  ├─→ IProvider (interface)
  ├─→ AnthropicProvider
  ├─→ GeminiProvider
  ├─→ LoggingProviderWrapper
  └─→ SettingsService

ToolRegistry
  ├─→ Tool implementations
  ├─→ McpClientManager
  └─→ Config

McpClientManager
  ├─→ McpClient
  ├─→ ToolRegistry
  ├─→ PromptRegistry
  └─→ WorkspaceContext
```

### CLI Module Dependencies

```
App (UI)
  ├─→ SessionContext
  ├─→ ThemeContext
  ├─→ StreamingContext
  ├─→ KeypressContext
  └─→ UIStateContext

useGeminiStream (hook)
  ├─→ GeminiClient (core)
  ├─→ Config (core)
  ├─→ HistoryService (core)
  ├─→ SessionContext
  └─→ useReactToolScheduler

CommandService
  ├─→ ICommandLoader
  ├─→ BuiltinCommandLoader
  ├─→ FileCommandLoader
  └─→ McpPromptLoader

ExtensionStorage
  ├─→ Config (core)
  ├─→ Storage (core)
  ├─→ SettingsService
  └─→ GitHub integration
```

## Potential Dependency Issues

### Critical Issues

**1. Config Class Overload**

- **Issue:** Config class has 50+ methods and manages too many concerns
- **Impact:** High coupling, difficult testing, poor maintainability
- **Risk:** High
- **Recommendation:** Refactor into smaller, focused classes

**2. Circular Dependencies**

- **Issue:** Core modules have circular dependencies via Config
- **Impact:** Build complexity, testing difficulties
- **Risk:** Medium
- **Recommendation:** Introduce dependency inversion with interfaces

**3. Singleton Abuse**

- **Issue:** Multiple singletons (SettingsService, UITelemetryService)
- **Impact:** Testing difficulties, hidden dependencies
- **Risk:** Medium
- **Recommendation:** Use dependency injection instead

**4. Tight Coupling to Google Types**

- **Issue:** Direct use of `@google/genai` types in core logic
- **Impact:** Difficult to add new providers, leaky abstraction
- **Risk:** Medium
- **Recommendation:** Create internal type abstractions

### Moderate Issues

**5. EventEmitter Overuse**

- **Issue:** Multiple EventEmitter-based patterns without type safety
- **Impact:** Runtime errors, difficult to track event flow
- **Risk:** Low-Medium
- **Recommendation:** Use typed event systems or RxJS

**6. Mixed Concerns in Services**

- **Issue:** Services mix business logic with infrastructure concerns
- **Impact:** Difficult to test, poor separation of concerns
- **Risk:** Low-Medium
- **Recommendation:** Apply hexagonal architecture principles

**7. Implicit Dependencies**

- **Issue:** Some modules rely on global state or environment variables
- **Impact:** Hidden dependencies, difficult to test
- **Risk:** Low
- **Recommendation:** Make dependencies explicit via constructor injection

**8. Version Pinning Inconsistency**

- **Issue:** Mix of exact versions and caret ranges
- **Impact:** Potential breaking changes from minor updates
- **Risk:** Low
- **Recommendation:** Document version pinning strategy

### Minor Issues

**9. Large Bundle Size**

- **Issue:** Many dependencies increase bundle size
- **Impact:** Slower startup, larger distribution
- **Risk:** Low
- **Recommendation:** Analyze bundle and consider tree-shaking

**10. Optional Dependency Complexity**

- **Issue:** Multiple platform-specific optional dependencies
- **Impact:** Complex installation, potential runtime errors
- **Risk:** Low
- **Recommendation:** Improve fallback handling and error messages

### Security Considerations

**11. API Key Management**

- **Issue:** Multiple authentication methods with precedence chain
- **Impact:** Potential security misconfiguration
- **Risk:** Medium
- **Recommendation:** Audit auth precedence and add security documentation

**12. External Service Dependencies**

- **Issue:** Direct dependencies on external APIs (Gemini, Anthropic)
- **Impact:** Service availability affects functionality
- **Risk:** Low
- **Recommendation:** Implement circuit breakers and fallbacks

**13. MCP Server Trust**

- **Issue:** MCP servers can execute arbitrary code
- **Impact:** Security risk from untrusted extensions
- **Risk:** Medium
- **Recommendation:** Enhance sandboxing and permission system

### Recommendations Priority

**High Priority:**

1. Refactor Config class into smaller components
2. Resolve circular dependencies
3. Strengthen provider abstraction layer
4. Audit authentication security

**Medium Priority:** 5. Replace singletons with dependency injection 6. Improve type safety for event systems 7. Document version pinning strategy 8. Enhance MCP security model

**Low Priority:** 9. Optimize bundle size 10. Improve error handling for optional dependencies 11. Add more integration tests for dependency interactions 12. Create dependency update automation

### Testing Recommendations

**Unit Testing:**

- Mock Config class for isolated testing
- Use dependency injection for better testability
- Create test doubles for external services

**Integration Testing:**

- Test provider switching and fallback
- Test MCP client lifecycle
- Test authentication precedence chain

**E2E Testing:**

- Test full user workflows
- Test extension system
- Test telemetry integration

### Maintenance Recommendations

**Dependency Updates:**

- Regular security audits of dependencies
- Automated dependency update PRs
- Breaking change impact analysis

**Documentation:**

- Document dependency rationale
- Create architecture decision records (ADRs)
- Maintain dependency graph diagrams

**Monitoring:**

- Track dependency vulnerabilities
- Monitor bundle size changes
- Track dependency update frequency
