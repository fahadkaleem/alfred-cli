# Anthropic Provider Refactoring Plan (AL-9)

## Executive Summary

The Anthropic integration (AL-8) successfully adds Claude support but violates Gemini's clean architecture patterns. The files solve REAL problems (tool format differences, OAuth, parallel tool calls) but don't follow Gemini's established patterns of single responsibility and focused implementations.

### Key Problems Identified

1. **alfredChat.ts bloat**: Grew from ~500 to 1210 lines (586 insertions)
2. **Provider-specific logic scattered**: Instead of encapsulated in providers
3. **Premature abstractions**: ProviderManager has unused methods like `compareProviders`
4. **Mixed responsibilities**: BaseProvider handles auth, OAuth, settings, caching all in one

### Goal: Keep ALL functionality but follow Gemini patterns

---

## Evidence of Problems

### Problem 1: alfredChat.ts Has Provider-Specific Logic

**Current (BAD)**: alfredChat.ts handles Anthropic's parallel tool call differences directly

```typescript
// Lines 302-329 in alfredChat.ts
if (provider && this.providerSupportsIContent(provider)) {
  // For providers like Anthropic, we need to split multiple tool responses
  const toolResponseParts = userContent.parts.filter(/*...*/);
  if (toolResponseParts.length > 0) {
    // Create separate messages for each tool response
    const toolResponseMessages: Content[] = toolResponseParts.map(/*...*/);
    requestContents = [...currentHistory, ...toolResponseMessages];
  }
}
```

**Gemini Pattern (GOOD)**: Tools handle their own specifics

```typescript
// packages/core/src/tools/shell.ts - Each tool is self-contained
export class ShellTool extends BaseDeclarativeTool<
  ShellToolParams,
  ToolResult
> {
  // Tool handles its own logic, not scattered in alfredChat
}
```

### Problem 2: ProviderManager Has Unused Features

**Current (BAD)**: 555 lines with methods never called

```typescript
// Lines 510-533 - NEVER USED anywhere in codebase
compareProviders(provider1: string, provider2: string): ProviderComparison
generateProviderRecommendation(/*...*/)
calculateCapabilityCompatibility(/*...*/)
```

**Evidence**:

```bash
grep -r "compareProviders\|generateProviderRecommendation" packages/ --include="*.ts" --exclude="ProviderManager.ts"
# Returns nothing - these methods are never called
```

### Problem 3: BaseProvider Mixes Everything

**Current (BAD)**: 583 lines mixing auth, OAuth, settings

```typescript
// BaseProvider.ts - Does everything
export abstract class BaseProvider {
  protected authResolver: AuthPrecedenceResolver; // Auth logic
  protected settingsService: SettingsService; // Settings
  protected oauthManager?: OAuthManager; // OAuth
  protected cachedAuthToken?: string; // Caching
  protected throttleTracker?: (ms: number) => void; // Performance
  // ... 30+ methods
}
```

**Gemini Pattern (GOOD)**: Single responsibility

```typescript
// packages/core/src/tools/read-file.ts - Does ONE thing
class ReadFileToolInvocation extends BaseToolInvocation {
  async execute(): Promise<ToolResult> {
    // Just reads the file, nothing else
  }
}
```

---

## The REAL Problems We're Solving

These are legitimate SDK differences that MUST be handled:

### 1. Tool Format Differences

- **Gemini**: `functionDeclarations` with `parametersJsonSchema`
- **Anthropic**: `tools` array with `input_schema`
- **Solution**: Keep ToolFormatter, just organize better

### 2. Message Format Differences

- **Gemini**: `parts` array with mixed types
- **Anthropic**: `content` array with type indicators
- **Solution**: Keep IContent and ContentConverters

### 3. Parallel Tool Calls

- **Gemini**: Single message with multiple function responses
- **Anthropic**: Separate messages for each tool response
- **Solution**: Let each provider handle its own format

### 4. OAuth Authentication

- **Anthropic**: Needs device flow OAuth
- **Gemini**: Uses Google auth
- **Solution**: Keep OAuth but move to auth module

---

## Refactoring Strategy (Following Gemini Patterns)

### Pattern 1: Move Provider-Specific Logic OUT of alfredChat

**Current alfredChat.ts (1210 lines)**:

```typescript
// BAD - Provider logic mixed in
private providerSupportsIContent(provider: IProvider): boolean
private convertIContentToResponse(input: IContent): GenerateContentResponse
private makeProviderApiCall(/*...*/)  // Provider-specific
```

**Target alfredChat.ts (~500 lines)**:

```typescript
// GOOD - Just orchestration
async sendMessageStream() {
  const provider = await this.config.getProvider();
  const stream = provider.generateContent(messages, tools);
  // Process stream generically
}
```

**How**: Each provider handles its own conversion internally

### Pattern 2: Provider Handles Own Complexity

**Move to AnthropicProvider**:

```typescript
class AnthropicProvider {
  async *generateContent(messages: Content[], tools: Tool[]) {
    // Handle parallel tool call splitting HERE
    const anthropicMessages = this.handleParallelToolCalls(messages);

    // Convert formats HERE
    const anthropicTools = this.toolFormatter.convert(tools);

    // Make API call
    const response = await this.client.messages.create(/*...*/);

    // Convert response back to Gemini format
    yield* this.convertToGeminiFormat(response);
  }

  private handleParallelToolCalls(messages: Content[]): AnthropicMessage[] {
    // Move the logic from alfredChat lines 302-329 HERE
  }
}
```

### Pattern 3: Remove Unused Abstractions

**Delete from ProviderManager**:

- `compareProviders()` - Never used
- `generateProviderRecommendation()` - Never used
- `captureProviderCapabilities()` - Over-engineered
- `calculateCapabilityCompatibility()` - Never used

**Keep in ProviderManager** (now ~100 lines):

- `getProvider()` - Get active provider
- `setProvider()` - Switch providers
- `registerProvider()` - Add providers
- Token tracking (actually used)

### Pattern 4: Split BaseProvider Responsibilities

**Current BaseProvider (583 lines)** → **Multiple focused files**:

1. **providers/anthropic-auth.ts** (50 lines)

```typescript
// Just OAuth for Anthropic
export class AnthropicAuth {
  async getToken(): Promise<string> {
    // Check env var
    // Check OAuth token store
    // Trigger device flow if needed
  }
}
```

2. **providers/anthropic.ts** (200 lines)

```typescript
// Just API calls and format conversion
export class AnthropicProvider {
  constructor(private auth: AnthropicAuth) {}

  async *generateContent(messages, tools) {
    const token = await this.auth.getToken();
    // API call logic
  }
}
```

3. **Use existing Config** for settings (don't create new SettingsService)

---

## Complete File Inventory with Decisions

### Files That Stay (With Purpose)

| File                         | Why Needed                           | Changes                      |
| ---------------------------- | ------------------------------------ | ---------------------------- |
| **IContent.ts**              | Universal format for SDK differences | Keep as-is                   |
| **ContentConverters.ts**     | Convert between formats              | Keep as-is                   |
| **ToolFormatter.ts**         | Convert tool formats                 | Keep as-is                   |
| **AnthropicTokenizer.ts**    | Token counting for Claude            | Keep as-is                   |
| **anthropic-device-flow.ts** | OAuth authentication                 | Move BaseProvider OAuth here |
| **token-store.ts**           | Store OAuth tokens                   | Keep as-is                   |
| **ThinkingMessage.tsx**      | Display thinking UI                  | Keep as-is                   |

### Files to Refactor (Follow Gemini Patterns)

| File                     | Current Lines | Target Lines | How                                        |
| ------------------------ | ------------- | ------------ | ------------------------------------------ |
| **alfredChat.ts**        | 1210          | ~500         | Remove provider-specific logic             |
| **AnthropicProvider.ts** | 1018          | ~300         | Remove BaseProvider, direct implementation |
| **GeminiProvider.ts**    | 800           | ~200         | Remove BaseProvider, restore simplicity    |
| **ProviderManager.ts**   | 555           | ~100         | Remove unused methods                      |
| **BaseProvider.ts**      | 583           | DELETE       | Split into focused pieces                  |
| **HistoryService.ts**    | 500+          | ~100         | Simplify to array management               |

### Files to Remove (Premature/Unused)

| File                                  | Why Remove                                               |
| ------------------------------------- | -------------------------------------------------------- |
| **LoggingProviderWrapper.ts**         | Premature optimization, add logging directly when needed |
| **ProviderContentGenerator.ts**       | Unnecessary adapter layer                                |
| **ProviderPerformanceTracker.ts**     | Not used, premature                                      |
| **ContentGeneratorRole.ts**           | Unused enum                                              |
| **SettingsService.ts** + related      | Use existing Config                                      |
| **ConfigurationManager.ts** + related | Over-abstraction for debug                               |
| **FileOutput.ts** + related           | Unused debug feature                                     |
| **ConversationFileWriter.ts**         | Unused                                                   |
| **MessageConverters.\*.test.txt**     | Text files in src                                        |
| **GeminiProvider.test.ts.disabled**   | Disabled test                                            |

---

## Implementation Plan

### Phase 1: Clean Up alfredChat.ts (Day 1-2)

#### Step 1.1: Extract Provider-Specific Logic

**Move from alfredChat.ts to providers**:

```typescript
// BEFORE (alfredChat.ts line 302-329)
if (provider && this.providerSupportsIContent(provider)) {
  // Complex logic for handling parallel tool calls
}

// AFTER (in AnthropicProvider)
class AnthropicProvider {
  private formatRequestMessages(messages: Content[]): AnthropicMessage[] {
    // Handle parallel tool calls here
  }
}
```

#### Step 1.2: Simplify API Call

**BEFORE** (alfredChat.ts):

```typescript
private async makeProviderApiCall(
  requestContents: Content[],
  _params: SendMessageParameters,
  _userInput: Content | Content[],
): Promise<AsyncGenerator<GenerateContentResponse>> {
  // Complex provider detection and conversion
}
```

**AFTER**:

```typescript
private async makeApiCall(messages: Content[], tools: Tool[]) {
  const provider = await this.config.getProvider();
  return provider.generateContent(messages, tools);
}
```

### Phase 2: Refactor Providers (Day 3-4)

#### Step 2.1: Remove BaseProvider Inheritance

**BEFORE**:

```typescript
export class AnthropicProvider extends BaseProvider {
  // Inherits 30+ methods
}
```

**AFTER**:

```typescript
export class AnthropicProvider implements Provider {
  constructor(
    private apiKey: string,
    private modelId: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async *generateContent(messages: Content[], tools: Tool[]) {
    // Direct implementation
  }
}
```

#### Step 2.2: Move OAuth to Auth Module

**BEFORE** (mixed in BaseProvider):

```typescript
protected async getAuthToken(): Promise<string> {
  // OAuth mixed with API key logic
}
```

**AFTER** (dedicated auth):

```typescript
// auth/anthropic-oauth.ts
export class AnthropicOAuth {
  static async getToken(): Promise<string> {
    // Check env var
    if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;

    // Check token store
    const stored = await TokenStore.get('anthropic');
    if (stored) return stored;

    // Trigger device flow
    return await AnthropicDeviceFlow.authenticate();
  }
}
```

### Phase 3: Simplify ProviderManager (Day 5)

**Remove these methods** (never used):

- Lines 510-533: `compareProviders()`
- Lines 535-554: `generateProviderRecommendation()`
- Lines 287-307: `isContextPreserved()`
- Lines 309-323: `captureProviderCapabilities()`
- Lines 325-375: Provider detection logic
- Lines 377-404: `calculateCapabilityCompatibility()`

**Keep only**:

```typescript
export class ProviderManager {
  private activeProvider: Provider | null = null;

  async getProvider(): Promise<Provider> {
    if (!this.activeProvider) {
      const authType = await this.config.getAuthType();
      this.activeProvider = await ProviderFactory.create(authType);
    }
    return this.activeProvider;
  }

  setProvider(provider: Provider): void {
    this.activeProvider = provider;
  }
}
```

### Phase 4: Update Tests (Day 6)

Fix the 31 failing tests in alfredChat.test.ts:

**BEFORE** (expects complex mocks):

```typescript
config.getProviderManager().getActiveProvider();
```

**AFTER** (simple mock):

```typescript
const mockProvider = {
  generateContent: vi.fn(),
  getModel: () => 'gemini-pro',
  setModel: vi.fn(),
};

config.getProvider = () => mockProvider;
```

---

## Success Metrics

### Quantitative

- **alfredChat.ts**: 1210 → ~500 lines
- **Provider files**: 47 → ~15 files (keeping needed ones)
- **Tests passing**: 2/33 → 33/33
- **No functionality lost**: OAuth ✓, Tools ✓, Formats ✓

### Code Quality (Gemini Patterns)

- ✓ Single responsibility per file
- ✓ Direct implementations over abstractions
- ✓ Provider handles its own complexity
- ✓ No premature optimization
- ✓ Clear separation of concerns

---

## Evidence This Will Work

### Gemini's Tool Pattern (We Should Follow)

```typescript
// packages/core/src/tools/shell.ts
class ShellToolInvocation extends BaseToolInvocation {
  // Handles all shell-specific logic internally
  // Doesn't leak into alfredChat.ts
}
```

### Gemini's Direct Style (We Should Follow)

```typescript
// packages/core/src/tools/read-file.ts - 134 lines total
// Does ONE thing: reads files
// No auth mixing, no settings, no OAuth
```

### What We're Fixing

```typescript
// Current: 8 new methods added to alfredChat.ts
private makeProviderApiCall()  // Should be in provider
private getActiveProvider()     // Should use config
private providerSupportsIContent() // Should be in provider
private convertIContentToResponse() // Should be in provider
// etc.
```

---

## Timeline

- **Day 1-2**: Clean up alfredChat.ts (remove 700 lines)
- **Day 3-4**: Refactor providers (remove BaseProvider)
- **Day 5**: Simplify ProviderManager (remove 400 lines)
- **Day 6**: Fix all tests
- **Day 7**: Remove unused files
- **Day 8**: Final testing and PR

---

## Conclusion

The Anthropic integration solves real problems (tool formats, OAuth, parallel calls) but doesn't follow Gemini's clean patterns. By moving provider-specific logic into providers and removing unused abstractions, we can keep all functionality while matching Gemini's focused, single-responsibility architecture.
