# Additional AL-8 Refactoring Items

## Items NOT Covered in refactor.md but Part of AL-8

**IMPORTANT**: All items in this document are specifically from AL-8 changes only. No general improvements or pre-existing technical debt is included here.

### 1. Provider Fallback Pattern in alfredChat

**Current Implementation** (lines 338-402):

```typescript
// Lines 346-386: Complex provider detection and fallback
const providerManager = this.config.getProviderManager();
let provider: IProvider | undefined;
if (providerManager) {
  try {
    provider = providerManager.getActiveProvider();
  } catch {
    provider = undefined;
  }
}

if (provider?.generateChatCompletion) {
  // Provider path
} else {
  // Fallback to legacy ContentGenerator
}
```

**Issue**: This creates two code paths - provider vs ContentGenerator
**Solution**: Make ContentGenerator implement the same interface as providers
**Target**: Single code path regardless of backend

### 2. processStreamResponse Method (Modified in AL-8)

**Pre-AL-8**: Simple stream processing
**AL-8 Changes**: Added provider support, IContent conversion
**Location**: alfredChat.ts lines 600-700+
**Issue**: AL-8 added complexity for provider handling
**Solution**: Split provider logic from core stream processing:

- Keep original simple path for ContentGenerator
- Move provider conversion to separate method

### 3. Token Tracking Scattered Across Files

**Files with token logic**:

- ProviderManager.ts: `accumulateSessionTokens()` (lines 409-431)
- LoggingProviderWrapper.ts: Token tracking wrapper
- alfredChat.ts: Usage metadata handling
- HistoryService.ts: Token counting in history

**Issue**: Token tracking logic spread across 4+ files
**Solution**: Centralize in one place - either Config or a dedicated TokenTracker

### 4. Debug System Refactoring

**DebugLogger.ts** - Keep but simplify

```typescript
// Current: Complex with FileOutput, ConfigurationManager
export class DebugLogger {
  constructor(
    namespace: string,
    configManager?: IConfigurationManager,
    fileOutput?: IFileOutput,
  ) {
    /*...*/
  }
}

// Target: Simple wrapper around console
export class DebugLogger {
  constructor(private namespace: string) {}

  debug(message: string | (() => string)) {
    if (process.env.DEBUG?.includes(this.namespace)) {
      console.debug(
        `[${this.namespace}]`,
        typeof message === 'function' ? message() : message,
      );
    }
  }
}
```

### 5. Test Files Updates Not Covered

**Test files modified in AL-8**:

- alfredChat.test.ts (31/33 failing)
- config.test.ts
- ContentConverters.test.ts (new)
- HistoryService.test.ts (new)
- precedence.test.ts (new)

**Missing from refactor.md**: Specific mock patterns needed

```typescript
// Need to document exact mock structure for:
const mockProvider = {
  generateChatCompletion: vi.fn().mockImplementation(async function* () {
    yield {
      /*...*/
    };
  }),
  // What other methods?
};
```

### 6. Error Handling Patterns

**New error types added**:

- AuthenticationRequiredError
- OAuth errors
- Provider-specific errors

**Issue**: Error handling scattered, no consistent pattern
**Solution**: Document error hierarchy and handling patterns

```typescript
// Provider errors should bubble up consistently
try {
  await provider.generateChatCompletion();
} catch (error) {
  if (error instanceof AuthenticationRequiredError) {
    // Re-auth flow
  }
  // Consistent handling
}
```

### 7. OAuth Flow Details

**Files**:

- anthropic-device-flow.ts - OAuth implementation
- token-store.ts - Token storage
- precedence.ts - Auth precedence

**Not covered**: How to properly extract OAuth from BaseProvider

```typescript
// Current: OAuth mixed in BaseProvider
protected async getAuthToken(): Promise<string> {
  // Complex precedence logic
}

// Target: Clean separation
class AnthropicAuth {
  static async getToken(): Promise<string> {
    // Just OAuth, no precedence mixing
  }
}
```

### 8. IContent Type Evolution

**Current IContent and subtypes**:

```typescript
interface IContent {
  speaker: 'human' | 'ai' | 'tool';
  blocks: ContentBlock[];
  metadata?: ContentMetadata;
}

// Multiple block types: TextBlock, ToolCallBlock, ToolResponseBlock, ThinkingBlock
```

**Issue**: Growing complexity, no validation
**Solution**: Add validation and builder pattern

```typescript
class IContentBuilder {
  static text(content: string): IContent;
  static toolCall(name: string, params: unknown): IContent;
  static toolResponse(id: string, result: unknown): IContent;
}
```

### 9. Tool Format Conversion Details

**ToolFormatter.ts** - Complex conversion logic

```typescript
convertGeminiToFormat(tools, 'anthropic');
convertAnthropicToGemini(tools);
```

**Not covered**: Where this should live

- Option 1: Keep centralized ToolFormatter
- Option 2: Each provider converts its own
- Option 3: Hybrid - shared base, provider-specific overrides

### 10. Build Configuration Changes

**Files modified**:

- esbuild.config.js
- package.json
- package-lock.json

**Not documented**:

- Bundle size impact of new dependencies
- Tree shaking considerations
- Whether @anthropic-ai/sdk is being bundled correctly

### 11. ContentGenerator Refactoring

**Current** (contentGenerator.ts):

```typescript
if (config.authType === AuthType.USE_ANTHROPIC) {
  // Return ProviderContentGenerator which delegates to providers
  return new ProviderContentGenerator(providerManager);
}
```

**Issue**: Two different ContentGenerator implementations
**Solution**: Unify interface so providers and ContentGenerator are interchangeable

### 12. History Service Internals

**HistoryService.ts** (888 lines) has:

- Compression logic
- Event handling
- Circular reference detection
- Lock management

**Not covered**: Which parts are actually needed

```typescript
// Do we need?
- compressionInProgress flag
- lockCompression/unlockCompression
- HistoryEvents
```

### 13. Provider Model Management

**Issue**: Model switching logic duplicated

```typescript
// AnthropicProvider.ts
setModel(modelId: string): void {
  settingsService.setProviderSetting(this.name, 'model', modelId);
}

// GeminiProvider.ts
setModel(modelId: string): void {
  // Different implementation
}
```

**Solution**: Standardize model management

### 14. Settings Service Usage Patterns

**Files using SettingsService**:

- BaseProvider.ts (20+ calls)
- ProviderManager.ts (10+ calls)
- AnthropicProvider.ts (15+ calls)

**Not covered**: Migration path from SettingsService to Config

```typescript
// Before
settingsService.setProviderSetting('anthropic', 'model', modelId);

// After - use existing Config?
this.config.setModel(modelId); // But Config doesn't know about providers
```

---

## Implementation Priority

### Phase 1: Clean up core flow (Week 1)

1. Provider fallback pattern
2. processStreamResponse splitting
3. Token tracking centralization

### Phase 2: Standardize patterns (Week 2)

4. Error handling patterns
5. OAuth extraction
6. Model management

### Phase 3: Type safety (Week 3)

7. IContent validation
8. Test mock patterns
9. ContentGenerator unification

### Phase 4: Optimization (Week 4)

10. Build configuration
11. History service simplification
12. Debug system cleanup
13. Provider model management
14. Settings service migration

---

## Open Questions

1. **Should ContentGenerator implement Provider interface?**
   - Pro: Single code path
   - Con: May need adapter pattern

2. **Where should token tracking live?**
   - Option A: Config (central)
   - Option B: Dedicated TokenTracker service
   - Option C: Each provider tracks its own

3. **How to handle SettingsService migration?**
   - Option A: Extend Config
   - Option B: Keep minimal SettingsService
   - Option C: Move all to providers

4. **Should we keep compression in HistoryService?**
   - Used by Gemini for context management
   - Not needed for Anthropic
   - Could be provider-specific

5. **Tool format conversion ownership?**
   - Centralized vs provider-owned
   - Impact on adding new providers

---

## Code Samples Needed

### Mock Structure for Tests

```typescript
// Document exact structure needed
const mockProvider = {
  // Required methods
  generateChatCompletion: vi.fn(),
  getModel: vi.fn(),
  setModel: vi.fn(),

  // Optional methods?
  isAuthenticated?: vi.fn(),
  countTokens?: vi.fn(),
}
```

### Provider Interface Final Form

```typescript
interface Provider {
  // Minimal required interface
  generateChatCompletion(
    messages: Content[], // or IContent[]?
    tools?: Tool[],
  ): AsyncGenerator<GenerateContentResponse>; // or IContent?

  // Model management
  getModel(): string;
  setModel(model: string): void;
}
```

### Error Hierarchy

```typescript
abstract class ProviderError extends Error {}
class AuthenticationError extends ProviderError {}
class RateLimitError extends ProviderError {}
class FormatError extends ProviderError {}
```

---

## Metrics to Track

- Line count reduction per file
- Test coverage maintenance
- Bundle size impact
- Number of provider-specific conditionals removed
- Type safety improvements (any → unknown conversions)
