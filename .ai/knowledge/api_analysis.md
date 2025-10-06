# API Documentation - Alfred CLI

## Project Overview

**Alfred CLI** is an open-source AI agent that brings the power of Google Gemini directly into the terminal. It's a Node.js/TypeScript application built as a monorepo with multiple packages, providing a CLI interface for interacting with Google's Gemini AI models.

**Technology Stack:**

- **Language:** TypeScript/Node.js (v20+)
- **Framework:** React (via Ink for terminal UI)
- **Build Tool:** esbuild
- **Package Manager:** npm workspaces
- **Architecture:** Monorepo with CLI and Core packages

**Key Packages:**

- `@alfred/alfred-cli` (packages/cli) - User-facing CLI interface
- `@alfred/alfred-cli-core` (packages/core) - Backend logic and API integration
- `@alfred/test-utils` (packages/test-utils) - Testing utilities

---

## APIs Served by This Project

### Primary Interface: Command Line Interface (CLI)

Alfred CLI is primarily a **command-line application** rather than a traditional HTTP API server. It does not expose REST or GraphQL endpoints for external consumption. Instead, it provides:

1. **Interactive Terminal Interface** - Real-time chat with Gemini AI
2. **Non-Interactive Mode** - Script-friendly single-shot queries
3. **Tool Execution System** - Internal API for extending capabilities

### Internal Tool API

The project implements an internal tool system that allows the AI to interact with the local environment:

#### Tool Interface Pattern

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

#### Available Built-in Tools

**File System Tools:**

- `read_file` - Read file contents
- `write_file` - Write/create files
- `edit` - Edit existing files with diffs
- `read_many_files` - Batch file reading
- `ls` - List directory contents
- `glob` - Pattern-based file discovery

**Search Tools:**

- `grep` - Search file contents
- `ripgrep` - Fast search using ripgrep
- `web_search` - Google Search grounding

**Execution Tools:**

- `shell` - Execute shell commands
- `web_fetch` - HTTP requests

**Memory Tools:**

- `memory` - Manage AI context from ALFRED.md files
- `write_todos` - Task management

**Location:** `packages/core/src/tools/`

#### Tool Registration

Tools are registered via `ToolRegistry`:

```typescript
// From packages/core/src/tools/tool-registry.ts
class ToolRegistry {
  registerTool(tool: DeclarativeTool): void;
  getTools(): DeclarativeTool[];
  getTool(name: string): DeclarativeTool | undefined;
}
```

#### Tool Execution Flow

1. **User Input** → CLI Package
2. **Request Processing** → Core Package constructs Gemini API prompt
3. **Gemini Response** → May include tool call requests
4. **Tool Confirmation** → User approves/rejects (for mutating operations)
5. **Tool Execution** → Core executes via ToolRegistry
6. **Result Handling** → Sent back to Gemini for final response
7. **Display** → CLI renders output to terminal

---

### Slash Commands API

The CLI provides meta-commands prefixed with `/`:

| Command                 | Description                   | Parameters         |
| ----------------------- | ----------------------------- | ------------------ |
| `/chat save <tag>`      | Save conversation state       | tag: string        |
| `/chat resume <tag>`    | Resume saved conversation     | tag: string        |
| `/chat list`            | List saved conversations      | -                  |
| `/chat delete <tag>`    | Delete saved conversation     | tag: string        |
| `/chat share <file>`    | Export conversation           | file: .md or .json |
| `/clear`                | Clear terminal                | -                  |
| `/compress`             | Summarize chat context        | -                  |
| `/copy`                 | Copy last output to clipboard | -                  |
| `/directory add <path>` | Add workspace directory       | path: string       |
| `/directory show`       | Show workspace directories    | -                  |
| `/editor`               | Select editor                 | -                  |
| `/extensions`           | List active extensions        | -                  |
| `/help`                 | Show help                     | -                  |
| `/mcp`                  | List MCP servers              | -                  |
| `/memory add <text>`    | Add to AI memory              | text: string       |
| `/memory show`          | Display memory                | -                  |
| `/memory refresh`       | Reload ALFRED.md files        | -                  |
| `/restore [id]`         | Restore file state            | id?: string        |
| `/settings`             | Open settings editor          | -                  |
| `/stats`                | Show session statistics       | -                  |

**Implementation:** `packages/cli/src/ui/commands/`

---

### Non-Interactive Mode API

For scripting and automation:

```bash
# Single query mode
echo "What is 2+2?" | alfred

# With output format
alfred --output json "Analyze this code"

# With specific model
alfred -m gemini-2.5-flash "Quick question"
```

**Implementation:** `packages/cli/src/nonInteractiveCli.ts`

**Output Formats:**

- `text` (default) - Plain text
- `json` - Structured JSON with metadata

---

## Authentication & Security

### Authentication Methods

Alfred CLI supports multiple authentication strategies:

#### 1. OAuth Login with Google (Recommended)

**Best for:** Individual developers, Google AI Pro/Ultra subscribers, Gemini Code Assist users

**Flow:**

1. User runs `alfred`
2. CLI initiates OAuth flow
3. Browser opens to Google authentication page
4. User authenticates
5. Credentials cached locally in `~/.alfred/`

**Implementation:**

- OAuth Client: `packages/core/src/code_assist/oauth2.ts`
- Credential Storage: `packages/core/src/code_assist/oauth-credential-storage.ts`
- Token Management: `packages/core/src/mcp/token-storage/`

**Configuration:**

```typescript
// OAuth Client Configuration
const OAUTH_CLIENT_ID =
  '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com';
const OAUTH_SCOPE = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];
```

**Credential Caching:**

- Location: `~/.alfred/credentials/`
- Encrypted storage option via `FORCE_ENCRYPTED_FILE_ENV_VAR`
- Automatic token refresh

#### 2. Gemini API Key

**Best for:** Developers needing specific model control

**Setup:**

```bash
export GEMINI_API_KEY="your-api-key"
alfred
```

**Rate Limits:**

- Free tier: 100 requests/day with Gemini 2.5 Pro
- Paid tier: Usage-based billing

**Implementation:** `packages/core/src/providers/gemini/GeminiProvider.ts`

#### 3. Vertex AI

**Best for:** Enterprise teams and production workloads

**Options:**

**a) API Key:**

```bash
export GOOGLE_API_KEY="your-vertex-api-key"
export GOOGLE_GENAI_USE_VERTEXAI=true
alfred
```

**b) Application Default Credentials (ADC):**

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"
alfred
```

**c) Service Account:**

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/keyfile.json"
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"
alfred
```

**Implementation:** `packages/core/src/code_assist/codeAssist.ts`

#### 4. Cloud Shell

**Best for:** Google Cloud Shell environments

**Setup:** Automatic - uses Cloud Shell credentials

---

### Security Features

#### 1. Tool Confirmation System

**Purpose:** Prevent unauthorized file system modifications

**Flow:**

```typescript
// From packages/core/src/tools/tools.ts
interface ToolInvocation {
  shouldConfirmExecute(
    signal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false>;
}
```

**Confirmation Required For:**

- File writes/edits
- Shell command execution
- Directory modifications

**Read-Only Operations (No Confirmation):**

- File reading
- Directory listing
- Search operations

**Implementation:** `packages/core/src/confirmation-bus/`

#### 2. Policy Engine

**Purpose:** Enforce security policies on tool execution

**Configuration:**

```typescript
interface PolicyEngineConfig {
  alwaysAllow?: string[]; // Tools that never require confirmation
  alwaysDeny?: string[]; // Tools that are always blocked
}
```

**Implementation:** `packages/core/src/policy/policy-engine.ts`

#### 3. Trusted Folders

**Purpose:** Restrict file system access to approved directories

**Configuration:** `packages/cli/src/config/trustedFolders.ts`

#### 4. Credential Security

**Features:**

- Encrypted credential storage (optional)
- Token refresh mechanism
- Secure browser launch for OAuth
- Environment variable isolation

**Implementation:**

- `packages/core/src/mcp/token-storage/keychain-token-storage.ts`
- `packages/core/src/utils/secure-browser-launcher.ts`

---

### Rate Limiting & Constraints

#### Token Limits

**Per Model:**

```typescript
// From packages/core/src/core/tokenLimits.ts
const tokenLimit = {
  'gemini-2.5-pro': 1_000_000,
  'gemini-2.5-flash': 1_000_000,
  'gemini-2.0-flash-exp': 1_000_000,
  // ... other models
};
```

#### Compression Thresholds

**Automatic Context Compression:**

```typescript
// From packages/core/src/core/client.ts
const COMPRESSION_TOKEN_THRESHOLD = 0.7; // 70% of token limit
const COMPRESSION_PRESERVE_THRESHOLD = 0.3; // Keep last 30%
```

#### Request Limits

**OAuth (Free Tier):**

- 60 requests/minute
- 1,000 requests/day

**API Key (Free Tier):**

- 100 requests/day

**Vertex AI:**

- Based on billing account quotas

#### Turn Limits

**Maximum Conversation Turns:**

```typescript
const MAX_TURNS = 100; // Per session
```

---

## External API Dependencies

### 1. Google Gemini API

**Purpose:** Core AI model interaction

**Base URLs:**

- Gemini API: `https://generativelanguage.googleapis.com`
- Vertex AI: `https://{location}-aiplatform.googleapis.com`

**Endpoints Used:**

#### Generate Content (Streaming)

```
POST /v1beta/models/{model}:streamGenerateContent
```

**Request:**

```typescript
interface GenerateContentRequest {
  contents: Content[];
  tools?: Tool[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}
```

**Response:** Server-Sent Events (SSE) stream

**Implementation:** `packages/core/src/core/alfredChat.ts`

#### Generate Content (Non-Streaming)

```
POST /v1beta/models/{model}:generateContent
```

**Authentication:**

- OAuth: Bearer token in Authorization header
- API Key: `key` query parameter
- Vertex AI: ADC or service account

**Error Handling:**

```typescript
// From packages/core/src/core/alfredChat.ts
- Retry with exponential backoff (max 2 attempts)
- Invalid content detection and retry
- Quota error detection
- Fallback to alternative models
```

**Retry Configuration:**

```typescript
const INVALID_CONTENT_RETRY_OPTIONS = {
  maxAttempts: 2,
  initialDelayMs: 500,
};
```

**Circuit Breaker:** Implemented via `packages/core/src/fallback/handler.ts`

---

### 2. Google Search API (Grounding)

**Purpose:** Web search grounding for AI responses

**Integration:** Via Gemini API's `googleSearch` tool

**Usage:**

```typescript
// From packages/core/src/tools/web-search.ts
const response = await alfredClient.generateContent(
  [{ role: 'user', parts: [{ text: query }] }],
  { tools: [{ googleSearch: {} }] },
);
```

**Response Includes:**

- Search results
- Grounding metadata
- Source citations

**Implementation:** `packages/core/src/tools/web-search.ts`

---

### 3. Model Context Protocol (MCP) Servers

**Purpose:** Extensible tool integration

**Supported Transports:**

- **stdio** - Local process communication
- **SSE** - Server-Sent Events over HTTP
- **HTTP** - Standard HTTP requests

**Configuration:**

```typescript
interface MCPServerConfig {
  command?: string; // For stdio
  args?: string[];
  env?: Record<string, string>;
  url?: string; // For SSE/HTTP
  timeout?: number; // Default: 10 minutes
  oauth?: MCPOAuthConfig;
}
```

**OAuth Support:**

```typescript
interface MCPOAuthConfig {
  enabled?: boolean;
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  redirectUri?: string;
}
```

**Discovery Flow:**

1. Connect to MCP server
2. List available tools
3. Register tools with ToolRegistry
4. Execute tools on demand

**Implementation:**

- Client: `packages/core/src/tools/mcp-client.ts`
- Manager: `packages/core/src/tools/mcp-client-manager.ts`
- OAuth: `packages/core/src/mcp/oauth-provider.ts`

**Error Handling:**

- Connection timeout (10 minutes default)
- Automatic reconnection attempts
- Tool execution error propagation

---

### 4. Google OAuth 2.0

**Purpose:** User authentication

**Endpoints:**

#### Authorization

```
GET https://accounts.google.com/o/oauth2/v2/auth
```

**Parameters:**

- `client_id`
- `redirect_uri`
- `response_type=code`
- `scope`
- `code_challenge` (PKCE)
- `code_challenge_method=S256`

#### Token Exchange

```
POST https://oauth2.googleapis.com/token
```

**Request:**

```typescript
{
  code: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  grant_type: 'authorization_code';
  code_verifier: string; // PKCE
}
```

**Response:**

```typescript
{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}
```

**Implementation:** `packages/core/src/code_assist/oauth2.ts`

**Security Features:**

- PKCE (Proof Key for Code Exchange)
- State parameter for CSRF protection
- Secure local callback server (port 7777)
- Automatic token refresh

---

### 5. Google Cloud Storage (Optional)

**Purpose:** Telemetry data export

**Usage:** When telemetry is configured with GCS target

**Implementation:** `packages/core/src/telemetry/gcp-exporters.ts`

---

## Integration Patterns

### 1. Provider Pattern

**Purpose:** Abstract different AI model providers

**Interface:**

```typescript
interface IProvider {
  getName(): string;
  isActive(): boolean;
  setModel(model: string): void;
  getModel(): string;
  generateChatCompletion(
    messages: IContent[],
    tools: FunctionDeclaration[],
    signal: AbortSignal,
  ): AsyncGenerator<IContent>;
}
```

**Implementations:**

- `GeminiProvider` - Native Gemini integration
- `AnthropicProvider` - Anthropic Claude models
- `OpenAIProvider` - OpenAI-compatible APIs

**Location:** `packages/core/src/providers/`

---

### 2. Content Generator Pattern

**Purpose:** Unified interface for AI model interaction

**Flow:**

```typescript
// From packages/core/src/core/contentGenerator.ts
interface ContentGenerator {
  generateContent(
    contents: Content[],
    config: GenerateContentConfig,
    signal: AbortSignal,
    model?: string,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    contents: Content[],
    config: GenerateContentConfig,
    signal: AbortSignal,
    model?: string,
  ): AsyncGenerator<GenerateContentResponse>;
}
```

**Implementations:**

- Native Gemini client
- Code Assist client (OAuth)
- Provider-based clients

---

### 3. Tool Scheduler Pattern

**Purpose:** Manage concurrent tool execution

**Features:**

- Parallel tool execution
- Abort signal propagation
- Progress tracking
- Error aggregation

**Implementation:** `packages/core/src/core/coreToolScheduler.ts`

---

### 4. Message Bus Pattern

**Purpose:** Decouple tool confirmation from execution

**Flow:**

```typescript
// From packages/core/src/confirmation-bus/message-bus.ts
class MessageBus {
  publish(request: ToolConfirmationRequest): void;
  subscribe(handler: (request: ToolConfirmationRequest) => void): Unsubscribe;
  respond(response: ToolConfirmationResponse): void;
}
```

**Usage:**

1. Tool publishes confirmation request
2. UI subscribes to requests
3. User approves/rejects
4. Tool receives response
5. Execution proceeds or aborts

---

### 5. History Service Pattern

**Purpose:** Manage conversation history with compression

**Features:**

- Circular reference detection
- Orphaned tool call cleanup
- Compression locking
- Provider-agnostic content format

**Implementation:** `packages/core/src/services/history/HistoryService.ts`

---

### 6. Telemetry Pattern

**Purpose:** Collect usage metrics and diagnostics

**Targets:**

- Console (development)
- File (local logging)
- OpenTelemetry (production)
- Google Cloud (enterprise)

**Implementation:** `packages/core/src/telemetry/`

**Events Tracked:**

- Session start/end
- Tool calls
- Token usage
- Errors
- Performance metrics

---

## Available Documentation

### Project Documentation

**Location:** `/docs/`

**Key Files:**

- `architecture.md` - System architecture overview
- `cli/authentication.md` - Authentication guide
- `cli/commands.md` - Command reference
- `cli/configuration.md` - Configuration guide
- `cli/themes.md` - Theme customization
- `extension.md` - Extension development
- `checkpointing.md` - File state management
- `troubleshooting.md` - Common issues

**Quality:** ⭐⭐⭐⭐⭐ (Excellent)

- Comprehensive coverage
- Clear examples
- Up-to-date with codebase
- Well-organized

---

### API Specifications

**OpenAPI/Swagger:** ❌ Not applicable (CLI application)

**GraphQL Schema:** ❌ Not applicable

**Protocol Buffers:** ❌ Not used

**MCP Protocol:** ✅ Supported

- Specification: https://modelcontextprotocol.io/
- Implementation: `@modelcontextprotocol/sdk`

---

### Code Documentation

**TypeScript Interfaces:** ✅ Well-documented

- Comprehensive type definitions
- JSDoc comments on key interfaces
- Clear parameter descriptions

**Example:**

```typescript
/**
 * Represents a validated and ready-to-execute tool call.
 * An instance of this is created by a `ToolBuilder`.
 */
export interface ToolInvocation<TParams, TResult> {
  /** The validated parameters for this specific invocation. */
  params: TParams;

  /** Gets a pre-execution description of the tool operation. */
  getDescription(): string;

  /** Determines what file system paths the tool will affect. */
  toolLocations(): ToolLocation[];

  /** Executes the tool with the validated parameters. */
  execute(signal: AbortSignal): Promise<TResult>;
}
```

---

### Integration Guides

**Available:**

- GitHub Actions integration
- MCP server development
- Extension development
- Custom tool creation

**Quality:** ⭐⭐⭐⭐ (Very Good)

- Clear step-by-step instructions
- Working examples
- Common pitfalls documented

---

### Testing Documentation

**Test Coverage:**

- Unit tests: ✅ Extensive
- Integration tests: ✅ Available
- E2E tests: ✅ Available

**Test Utilities:** `packages/test-utils/`

**Running Tests:**

```bash
npm test                    # All tests
npm run test:ci            # CI tests
npm run test:e2e           # E2E tests
npm run test:integration   # Integration tests
```

---

## Documentation Quality Assessment

### Strengths

1. **Comprehensive Architecture Docs** - Clear system overview
2. **Detailed Authentication Guide** - Multiple auth methods well-explained
3. **Command Reference** - Complete slash command documentation
4. **Type Safety** - Strong TypeScript typing throughout
5. **Code Comments** - Key interfaces well-documented

### Gaps

1. **API Rate Limiting Details** - Could be more specific about retry strategies
2. **Error Code Reference** - No centralized error code documentation
3. **Performance Tuning** - Limited guidance on optimization
4. **Deployment Guide** - Minimal production deployment documentation
5. **API Versioning** - No explicit API versioning strategy documented

### Recommendations for AI Agents

1. **Start with:** `docs/architecture.md` for system overview
2. **Authentication:** `docs/cli/authentication.md` for auth flows
3. **Tool Development:** `packages/core/src/tools/tools.ts` for interfaces
4. **Extension Development:** `docs/extension.md` for extensibility
5. **Configuration:** `docs/cli/configuration.md` for settings

---

## Summary

Alfred CLI is a **terminal-based AI agent** rather than a traditional API server. It provides:

- **No HTTP APIs** - CLI-only interface
- **Internal Tool API** - Extensible tool system for AI capabilities
- **Multiple Auth Methods** - OAuth, API keys, Vertex AI
- **MCP Integration** - Extensible via Model Context Protocol
- **Strong Security** - Tool confirmation, policy engine, trusted folders
- **Well-Documented** - Comprehensive docs for users and developers

**For AI Integration:**

- Use non-interactive mode for scripting
- Extend via MCP servers or custom tools
- Leverage OAuth for production deployments
- Follow tool confirmation patterns for safety

**Documentation Quality:** ⭐⭐⭐⭐ (4/5)

- Excellent user documentation
- Good code documentation
- Some gaps in operational/deployment guides
- Strong foundation for AI agent understanding
