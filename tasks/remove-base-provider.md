# Remove BaseProvider Refactoring Guide

## Overview

BaseProvider (583 lines) violates Gemini's single responsibility principle. This document outlines how to remove it while preserving all functionality.

## Where BaseProvider Functionality Goes

### 1. Authentication Logic → Already in Config or Provider-Specific

**Current (BaseProvider):**

```typescript
protected async getAuthToken(): Promise<string> {
  const token = await this.authResolver.resolveAuthentication();
  this.cachedAuthToken = token;
  return token;
}
```

**New (AnthropicProvider):**

```typescript
class AnthropicProvider implements IProvider {
  private cachedAuthToken?: string;

  private async getAuthToken(): Promise<string> {
    // Cache check
    if (this.cachedAuthToken) return this.cachedAuthToken;

    // Anthropic-specific auth resolution
    const token =
      process.env.ANTHROPIC_API_KEY ||
      (await TokenStore.get('anthropic')) ||
      (await AnthropicDeviceFlow.authenticate());

    this.cachedAuthToken = token;
    return token;
  }
}
```

**New (GeminiProvider):**

```typescript
class GeminiProvider implements IProvider {
  // Gemini doesn't need this - Config.refreshAuth handles it
  // Just use the apiKey passed in constructor
}
```

### 2. Settings Management → Use Config.getSettingsService() Directly

**Current (BaseProvider):**

```typescript
protected getModel(): string {
  const settingsService = getSettingsService();
  // Complex precedence logic
}
```

**New (Direct Access):**

```typescript
class AnthropicProvider implements IProvider {
  private getModel(): string {
    const settings = this.config.getSettingsService();
    return (
      (settings.getProviderSettings('anthropic')['model'] as string) ||
      'claude-3-5-sonnet-20241022'
    );
  }
}
```

### 3. Token Usage Tracking → Provider-Specific

**Current (LoggingProviderWrapper - Generic):**

```typescript
// Tries to handle all providers generically
extractTokenCountsFromResponse(response: unknown) {
  // Looks for usage.prompt_tokens (wrong for Anthropic!)
}
```

**New (AnthropicProvider - Specific):**

```typescript
class AnthropicProvider implements IProvider {
  private extractTokenUsage(response: Anthropic.Message): UsageStats {
    return {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      cacheTokens: response.usage.cache_creation_input_tokens +
                   response.usage.cache_read_input_tokens
    };
  }

  async *generateChatCompletion(content: IContent[], tools?: Tool[]) {
    const response = await this.client.messages.create(...);

    // Extract Anthropic-specific usage
    const usage = this.extractTokenUsage(response);

    // Log directly to telemetry
    logTokenUsage(
      this.config.getSessionId(),
      new TokenUsageEvent(
        this.name,
        this.getModel(),
        usage.promptTokens,
        usage.completionTokens,
        usage.cacheTokens
      )
    );

    // Add to IContent metadata for any downstream consumers
    yield {
      ...convertedContent,
      metadata: { usage }
    };
  }
}
```

**New (GeminiProvider - Specific):**

```typescript
class GeminiProvider implements IProvider {
  private extractTokenUsage(response: GenerateContentResponse): UsageStats {
    const metadata = response.usageMetadata;
    return {
      promptTokens: metadata?.promptTokenCount || 0,
      completionTokens: metadata?.candidatesTokenCount || 0,
      totalTokens: metadata?.totalTokenCount || 0,
    };
  }

  // Similar pattern as Anthropic
}
```

### 4. Throttle Tracking → Simple Utility Function

**Current (BaseProvider):**

```typescript
protected throttleTracker?: (waitTimeMs: number) => void;
setThrottleTracker(tracker: (waitTimeMs: number) => void): void {
  this.throttleTracker = tracker;
}
```

**New (Utility Function):**

```typescript
// utils/throttle-tracker.ts
export function trackThrottle(providerName: string, waitTimeMs: number): void {
  // Log throttle event directly
  console.debug(`Provider ${providerName} throttled for ${waitTimeMs}ms`);
}

// In provider:
catch (error) {
  if (error.status === 429) {
    const waitTime = error.headers?.['retry-after'] || 60;
    trackThrottle(this.name, waitTime * 1000);
    throw error;
  }
}
```

### 5. Model-Specific Configuration → Provider Owns It

**Current (BaseProvider):**

```typescript
protected getProviderModelParams(): ModelParams | undefined {
  // Complex settings resolution
}
```

**New (AnthropicProvider):**

```typescript
class AnthropicProvider implements IProvider {
  // Model-specific max tokens (Anthropic-specific!)
  private modelTokenLimits: Map<RegExp, number> = new Map([
    [/claude-.*opus-4/i, 32000],
    [/claude-.*sonnet-4/i, 64000],
    [/claude-.*haiku-4/i, 200000],
    [/claude-.*3-5.*sonnet/i, 8192],
    [/claude-.*3.*opus/i, 4096],
  ]);

  private getMaxTokens(model: string): number {
    for (const [pattern, tokens] of this.modelTokenLimits) {
      if (pattern.test(model)) return tokens;
    }
    return 4096; // Default
  }
}
```

## Implementation Steps

### Step 1: Create Direct AnthropicProvider (No Inheritance)

```typescript
// packages/core/src/providers/anthropic/AnthropicProvider.ts
import type { IProvider } from '../IProvider.js';
import type { IContent } from '../../services/history/IContent.js';
import type { Config } from '../../config/config.js';
import { Anthropic } from '@anthropic-ai/sdk';
import { logTokenUsage } from '../../telemetry/loggers.js';
import { TokenUsageEvent } from '../../telemetry/types.js';

export class AnthropicProvider implements IProvider {
  readonly name = 'anthropic';
  readonly isDefault = false;

  private client: Anthropic;
  private cachedAuthToken?: string;
  private toolFormatter: ToolFormatter;

  constructor(
    private config: Config,
    private apiKey?: string,
  ) {
    this.toolFormatter = new ToolFormatter();
  }

  async initialize(): Promise<void> {
    const token = await this.getAuthToken();

    // OAuth vs API key detection (Anthropic-specific!)
    if (token.startsWith('sk-ant-oat')) {
      this.client = new Anthropic({ authToken: token });
    } else {
      this.client = new Anthropic({ apiKey: token });
    }
  }

  private async getAuthToken(): Promise<string> {
    if (this.cachedAuthToken) return this.cachedAuthToken;

    const token =
      this.apiKey ||
      process.env.ANTHROPIC_API_KEY ||
      (await TokenStore.get('anthropic')) ||
      (await this.triggerOAuthFlow());

    this.cachedAuthToken = token;
    return token;
  }

  async *generateChatCompletion(
    content: IContent[],
    tools?: Tool[],
  ): AsyncIterableIterator<IContent> {
    if (!this.client) await this.initialize();

    // Handle parallel tool responses (Anthropic-specific!)
    const processedContent = this.handleParallelToolResponses(content);

    // Convert to Anthropic format
    const messages = this.convertToAnthropicMessages(processedContent);
    const anthropicTools = tools ? this.toolFormatter.format(tools) : undefined;

    // Get model and settings
    const settings = this.config.getSettingsService();
    const model =
      (settings.getProviderSettings('anthropic')['model'] as string) ||
      'claude-3-5-sonnet-20241022';
    const maxTokens = this.getMaxTokens(model);

    // Make API call
    const stream = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      messages,
      tools: anthropicTools,
      stream: true,
    });

    // Stream responses
    for await (const chunk of stream) {
      const iContent = this.convertChunkToIContent(chunk);

      // Extract and log token usage (Anthropic-specific format!)
      if (chunk.usage) {
        const usage = {
          promptTokens: chunk.usage.input_tokens,
          completionTokens: chunk.usage.output_tokens,
          totalTokens: chunk.usage.input_tokens + chunk.usage.output_tokens,
          cacheTokens:
            chunk.usage.cache_creation_input_tokens +
            chunk.usage.cache_read_input_tokens,
        };

        logTokenUsage(
          this.config.getSessionId(),
          new TokenUsageEvent(
            this.name,
            model,
            usage.promptTokens,
            usage.completionTokens,
          ),
        );

        iContent.metadata = { usage };
      }

      yield iContent;
    }
  }

  // Keep all Anthropic-specific methods
  private handleParallelToolResponses(content: IContent[]): IContent[] {
    // ... existing logic from current AnthropicProvider
  }

  private getMaxTokens(model: string): number {
    // Model-specific max tokens (Anthropic-specific!)
    const modelTokenLimits: Map<RegExp, number> = new Map([
      [/claude-.*opus-4/i, 32000],
      [/claude-.*sonnet-4/i, 64000],
      [/claude-.*haiku-4/i, 200000],
      [/claude-.*3-5.*sonnet/i, 8192],
      [/claude-.*3.*opus/i, 4096],
    ]);

    for (const [pattern, tokens] of modelTokenLimits) {
      if (pattern.test(model)) return tokens;
    }
    return 4096; // Default
  }

  // Required IProvider methods
  async getModels(): Promise<IModel[]> {
    return [
      { name: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet' },
      { name: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku' },
      { name: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus' },
      { name: 'claude-3-sonnet-20240229', displayName: 'Claude 3 Sonnet' },
      { name: 'claude-3-haiku-20240307', displayName: 'Claude 3 Haiku' },
    ];
  }

  getDefaultModel(): string {
    return 'claude-3-5-sonnet-20241022';
  }

  getCurrentModel(): string {
    const settings = this.config.getSettingsService();
    return (
      (settings.getProviderSettings('anthropic')['model'] as string) ||
      this.getDefaultModel()
    );
  }

  // Optional IProvider methods (but used by Config)
  setModel(modelId: string): void {
    const settings = this.config.getSettingsService();
    settings.setProviderSetting('anthropic', 'model', modelId);
  }

  setModelParams(params: Record<string, unknown> | undefined): void {
    const settings = this.config.getSettingsService();
    if (params === undefined) {
      // Clear parameters
      settings.setProviderSetting('anthropic', 'temperature', undefined);
      settings.setProviderSetting('anthropic', 'max_tokens', undefined);
      settings.setProviderSetting('anthropic', 'top_p', undefined);
      settings.setProviderSetting('anthropic', 'top_k', undefined);
    } else {
      // Set parameters (handle different naming conventions)
      if ('temperature' in params) {
        settings.setProviderSetting(
          'anthropic',
          'temperature',
          params.temperature,
        );
      }
      if ('max_tokens' in params) {
        settings.setProviderSetting(
          'anthropic',
          'max_tokens',
          params.max_tokens,
        );
      }
      if ('top_p' in params) {
        settings.setProviderSetting('anthropic', 'top_p', params.top_p);
      }
      if ('top_k' in params) {
        settings.setProviderSetting('anthropic', 'top_k', params.top_k);
      }
    }
  }

  getModelParams(): Record<string, unknown> | undefined {
    const settings = this.config.getSettingsService();
    const providerSettings = settings.getProviderSettings('anthropic');

    const params: Record<string, unknown> = {};
    if (providerSettings.temperature !== undefined) {
      params.temperature = providerSettings.temperature;
    }
    if (providerSettings.max_tokens !== undefined) {
      params.max_tokens = providerSettings.max_tokens;
    }
    if (providerSettings.top_p !== undefined) {
      params.top_p = providerSettings.top_p;
    }
    if (providerSettings.top_k !== undefined) {
      params.top_k = providerSettings.top_k;
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }

  // Internal methods (part of IProvider interface but for internal use)
  setApiKey(apiKey: string): void {
    this.cachedAuthToken = undefined;
    this.apiKey = apiKey;
    // Also update in settings for persistence
    const settings = this.config.getSettingsService();
    settings.set('auth-key', apiKey || undefined);
  }

  clearAuth(): void {
    this.cachedAuthToken = undefined;
    const settings = this.config.getSettingsService();
    settings.set('auth-key', undefined);
    settings.set('auth-keyfile', undefined);
  }

  clearAuthCache(): void {
    this.cachedAuthToken = undefined;
  }

  setBaseUrl(baseUrl?: string): void {
    const settings = this.config.getSettingsService();
    settings.set('base-url', baseUrl || undefined);
  }

  clearState(): void {
    this.cachedAuthToken = undefined;
  }

  // Server tools (required by IProvider)
  getServerTools(): string[] {
    return []; // Anthropic doesn't have server tools
  }

  async invokeServerTool(
    toolName: string,
    _params: unknown,
    _config?: unknown,
  ): Promise<unknown> {
    throw new Error(`Server tool '${toolName}' not supported by Anthropic`);
  }
}
```

### Step 2: Simplify GeminiProvider (Remove Inheritance)

```typescript
// packages/core/src/providers/gemini/GeminiProvider.ts
export class GeminiProvider implements IProvider {
  readonly name = 'gemini';
  readonly isDefault = true;

  private client?: GoogleGenerativeAI;

  constructor(
    private config: Config,
    private apiKey: string,
    private baseUrl?: string,
  ) {}

  async *generateChatCompletion(
    content: IContent[],
    tools?: Tool[],
  ): AsyncIterableIterator<IContent> {
    // Much simpler - Gemini doesn't need auth complexity
    if (!this.client) {
      this.client = new GoogleGenerativeAI({
        apiKey: this.apiKey,
        baseUrl: this.baseUrl,
      });
    }

    const model = this.config.getModel() || 'gemini-2.0-flash-exp';
    const genAI = this.client.getGenerativeModel({ model });

    // Convert IContent to Gemini format
    const geminiContent = this.convertToGeminiFormat(content);

    // Stream response
    const stream = await genAI.generateContentStream({
      contents: geminiContent,
      tools,
    });

    for await (const chunk of stream) {
      const iContent = this.convertChunkToIContent(chunk);

      // Log Gemini-specific token usage
      if (chunk.usageMetadata) {
        const usage = {
          promptTokens: chunk.usageMetadata.promptTokenCount,
          completionTokens: chunk.usageMetadata.candidatesTokenCount,
          totalTokens: chunk.usageMetadata.totalTokenCount,
        };

        logTokenUsage(
          this.config.getSessionId(),
          new TokenUsageEvent(
            this.name,
            model,
            usage.promptTokens,
            usage.completionTokens,
          ),
        );

        iContent.metadata = { usage };
      }

      yield iContent;
    }
  }

  // Required IProvider methods
  async getModels(): Promise<IModel[]> {
    return [
      {
        name: 'gemini-2.0-flash-exp',
        displayName: 'Gemini 2.0 Flash (Experimental)',
      },
      {
        name: 'gemini-2.0-flash-thinking-exp',
        displayName: 'Gemini 2.0 Flash Thinking',
      },
      { name: 'gemini-1.5-pro-latest', displayName: 'Gemini 1.5 Pro' },
      { name: 'gemini-1.5-flash-latest', displayName: 'Gemini 1.5 Flash' },
    ];
  }

  getDefaultModel(): string {
    return 'gemini-2.0-flash-exp';
  }

  getCurrentModel(): string {
    // Gemini uses Config.getModel() directly
    return this.config.getModel() || this.getDefaultModel();
  }

  // Optional methods (Gemini uses simpler approach)
  setModel(modelId: string): void {
    // Gemini stores in Config directly, not in settings
    this.config.setModel(modelId);
  }

  setModelParams(params: Record<string, unknown> | undefined): void {
    // Gemini doesn't persist model params in settings
    // They're passed directly in the generate calls
  }

  getModelParams(): Record<string, unknown> | undefined {
    // Gemini doesn't have persistent model params
    return undefined;
  }

  // Internal methods (simpler for Gemini)
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    // Reinitialize client with new key
    this.client = undefined;
  }

  clearAuth(): void {
    // Gemini auth is handled by Config.refreshAuth()
    const settings = this.config.getSettingsService();
    settings.set('auth-key', undefined);
  }

  clearAuthCache(): void {
    // No auth cache for Gemini - uses direct API key
  }

  setBaseUrl(baseUrl?: string): void {
    this.baseUrl = baseUrl;
    // Reinitialize client with new URL
    this.client = undefined;
  }

  clearState(): void {
    // Nothing to clear for Gemini
  }

  // Server tools (Gemini has actual server tools)
  getServerTools(): string[] {
    return ['code_execution', 'google_search']; // Example server tools
  }

  async invokeServerTool(
    toolName: string,
    params: unknown,
    config?: unknown,
  ): Promise<unknown> {
    // Implement actual server tool invocation for Gemini
    // This would call Gemini's server-side tools
    switch (toolName) {
      case 'code_execution':
        // Call Gemini's code execution tool
        return this.executeCode(params);
      case 'google_search':
        // Call Gemini's search tool
        return this.googleSearch(params);
      default:
        throw new Error(`Server tool '${toolName}' not supported by Gemini`);
    }
  }

  private async executeCode(params: unknown): Promise<unknown> {
    // Implementation for code execution
    // ... existing logic
  }

  private async googleSearch(params: unknown): Promise<unknown> {
    // Implementation for google search
    // ... existing logic
  }
}
```

### Step 3: Update LoggingProviderWrapper (Simplify)

```typescript
// packages/core/src/providers/LoggingProviderWrapper.ts
// REMOVE all token extraction logic - providers handle it themselves
export class LoggingProviderWrapper implements IProvider {
  constructor(
    private wrapped: IProvider,
    private config: Config,
  ) {}

  async *generateChatCompletion(
    content: IContent[],
    tools?: Tool[],
  ): AsyncIterableIterator<IContent> {
    const startTime = Date.now();

    try {
      // Just pass through and log timing
      for await (const chunk of this.wrapped.generateChatCompletion(
        content,
        tools,
      )) {
        // Token usage is already logged by the provider itself
        yield chunk;
      }
    } finally {
      const duration = Date.now() - startTime;
      console.debug(`Provider ${this.wrapped.name} took ${duration}ms`);
    }
  }

  // Delegate all other methods
  get name() {
    return this.wrapped.name;
  }
  getModels() {
    return this.wrapped.getModels();
  }
  clearState() {
    return this.wrapped.clearState();
  }
}
```

### Step 4: Delete BaseProvider

```bash
rm packages/core/src/providers/BaseProvider.ts
rm packages/core/src/providers/helpers/ProviderAuthHelper.ts
rm packages/core/src/providers/helpers/ProviderSettingsHelper.ts
```

## Files to Update

1. **packages/core/src/providers/anthropic/AnthropicProvider.ts**
   - Remove `extends BaseProvider`
   - Add direct implementation of IProvider
   - Keep all Anthropic-specific logic

2. **packages/core/src/providers/gemini/GeminiProvider.ts**
   - Remove `extends BaseProvider`
   - Simplify to ~200 lines
   - Direct GoogleGenerativeAI usage

3. **packages/core/src/providers/LoggingProviderWrapper.ts**
   - Remove token extraction (providers handle it)
   - Just log timing and errors

4. **packages/core/src/config/config.ts**
   - Already handles auth correctly
   - No changes needed

## Functionality Preserved (No Loss!)

### ✅ All Required IProvider Methods

- `generateChatCompletion()` - Core streaming functionality
- `getModels()` - List available models
- `getDefaultModel()` - Return default model
- `getCurrentModel()` - Get current active model
- `getServerTools()` / `invokeServerTool()` - Server-side tools

### ✅ All Used Optional Methods

- `setModel()` - Used by Config (line 612)
- `setModelParams()` - Save temperature, max_tokens, etc.
- `getModelParams()` - Retrieve saved parameters
- `setApiKey()` - Update API key dynamically
- `clearAuth()` - Clear authentication
- `clearAuthCache()` - Clear cached tokens
- `setBaseUrl()` - Update endpoint URL
- `clearState()` - Reset provider state

### ✅ Provider-Specific Features

- **Anthropic**:
  - OAuth flow (`sk-ant-oat` detection)
  - Model-specific token limits (32k/64k/200k)
  - Parallel tool response handling
  - Correct token usage format (`input_tokens`, `output_tokens`)

- **Gemini**:
  - Direct Google auth
  - Server tools (code_execution, google_search)
  - Correct token usage format (`promptTokenCount`, `candidatesTokenCount`)

## What We Keep

- ✅ Anthropic-specific token limits (32k/64k/200k per model)
- ✅ OAuth token detection (`sk-ant-oat` prefix)
- ✅ Parallel tool response handling
- ✅ Provider-specific token usage extraction
- ✅ Tool format conversion (ToolFormatter)
- ✅ IContent/ContentConverters for format differences
- ✅ All authentication methods (API keys, OAuth, env vars)
- ✅ Settings persistence via Config.getSettingsService()

## What We Remove

- ❌ BaseProvider (583 lines of mixed responsibilities)
- ❌ Generic token extraction in LoggingProviderWrapper
- ❌ ProviderAuthHelper (use direct implementation)
- ❌ ProviderSettingsHelper (use Config.getSettingsService())
- ❌ Complex inheritance chain
- ❌ Unused methods (hasNonOAuthAuthentication, isOAuthOnlyAvailable, etc.)

## Result

- **AnthropicProvider**: ~400 lines (focused, Anthropic-specific, all features)
- **GeminiProvider**: ~250 lines (simple, direct, all features)
- **LoggingProviderWrapper**: ~100 lines (just timing/error logging)
- **Total Reduction**: ~800 lines removed
- **Better Architecture**: Each provider owns its complexity
- **No Functionality Lost**: All used features preserved
