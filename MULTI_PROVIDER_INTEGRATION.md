# Multi-Provider Integration Guide

## ✅ Files Copied Successfully

### Core Provider System (`packages/core/src/providers/`)

- ✅ `IProvider.ts` - Provider interface
- ✅ `IProviderManager.ts` - Manager interface
- ✅ `IModel.ts` - Model interface
- ✅ `ITool.ts` - Tool interface
- ✅ `BaseProvider.ts` - Base class for all providers
- ✅ `ProviderManager.ts` - Multi-provider orchestration
- ✅ `ProviderContentGenerator.ts` - Adapts providers to content generator
- ✅ `ContentGeneratorRole.ts` - Role types
- ✅ `errors.ts` - Provider-specific errors
- ✅ `types.ts` - Provider types
- ✅ `types/IProviderConfig.ts` - Config types

### Provider Implementations

- ✅ `anthropic/AnthropicProvider.ts` - Claude integration
- ✅ `openai/OpenAIProvider.ts` - OpenAI/GPT integration
- ✅ `openai/` - 22 supporting files for OpenAI integration

### Logging & Telemetry

- ✅ `LoggingProviderWrapper.ts` - Token tracking, performance, conversation logging
- ✅ `logging/ProviderPerformanceTracker.ts` - Latency, tokens/sec, errors
- ✅ `logging/ProviderContentExtractor.ts` - Content extraction for logging

### Tokenizers

- ✅ `tokenizers/ITokenizer.ts` - Tokenizer interface
- ✅ `tokenizers/AnthropicTokenizer.ts` - Claude token counting
- ✅ `tokenizers/OpenAITokenizer.ts` - GPT token counting

### UI Components (`packages/cli/src/ui/`)

- ✅ `components/ProviderDialog.tsx` - Provider selection UI
- ✅ `components/ProviderModelDialog.tsx` - Model selection UI
- ✅ `commands/providerCommand.ts` - /provider slash command
- ✅ `commands/modelCommand.ts` - /model slash command

### Branding

- ✅ All copyright headers updated to "Alfred CLI Contributors"
- ✅ Debug logger namespaces changed from `llxprt:` to `alfred:`
- ✅ Package references updated from `@vybestack/llxprt-code` to `@alfred/cli`

---

## 🔧 Integration Steps Required

### 1. Install Dependencies

Add these to `packages/core/package.json`:

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "openai": "^4.73.0",
    "@dqbd/tiktoken": "^1.0.7"
  }
}
```

### 2. Wire Up ProviderManager

#### Option A: Replace ContentGenerator (Recommended)

Replace the existing `ContentGenerator` with `ProviderManager`:

```typescript
// In packages/core/src/core/session.ts (or wherever ContentGenerator is used)
import { ProviderManager } from '../providers/ProviderManager.js';
import { ProviderContentGenerator } from '../providers/ProviderContentGenerator.js';

// Replace old ContentGenerator instantiation with:
const providerManager = new ProviderManager();
providerManager.setConfig(config);

// Register providers
const geminiProvider = new GeminiProvider(apiKey);
const anthropicProvider = new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
const openaiProvider = new OpenAIProvider(process.env.OPENAI_API_KEY);

providerManager.registerProvider(geminiProvider);
providerManager.registerProvider(anthropicProvider);
providerManager.registerProvider(openaiProvider);

// Set active provider
providerManager.setServerToolsProvider('gemini'); // or 'anthropic', 'openai'

// Wrap with adapter for backward compatibility
const contentGenerator = new ProviderContentGenerator(providerManager);
```

#### Option B: Keep ContentGenerator, Add ProviderManager Alongside

If you want to keep existing code working, run them in parallel initially.

### 3. Update Config System

Add provider configuration to your config:

```typescript
// In packages/core/src/config/config.ts
interface ConfigData {
  // ... existing fields
  activeProvider?: string;
  providers?: {
    [name: string]: {
      apiKey?: string;
      baseUrl?: string;
      model?: string;
    };
  };
}
```

### 4. Register Slash Commands

```typescript
// In packages/cli/src/ui/commands/index.ts (or wherever commands are registered)
import { providerCommand } from './providerCommand.js';
import { modelCommand } from './modelCommand.js';

// Register commands
registerCommand('provider', providerCommand);
registerCommand('model', modelCommand);
```

### 5. Missing Dependencies to Create

You'll need to create or adapt these files that llxprt-code depends on:

#### Required:

- `packages/core/src/debug/DebugLogger.ts` - Debug logging utility (or stub it out)
- `packages/core/src/telemetry/loggers.ts` - Telemetry logging functions
- `packages/core/src/telemetry/types.ts` - Telemetry event types
- `packages/core/src/auth/precedence.ts` - OAuth manager (or remove OAuth support for now)
- `packages/core/src/tools/ToolFormatter.ts` - Tool format conversion
- `packages/core/src/storage/ConversationFileWriter.ts` - Conversation logging to files

#### Optional (can stub out initially):

- OAuth integration (in `BaseProvider.ts` and `AnthropicProvider.ts`)
- Conversation file logging (in `LoggingProviderWrapper.ts`)
- Redaction system (in `LoggingProviderWrapper.ts`)

---

## 🎯 Testing Plan

### Phase 1: Basic Integration

1. ✅ Copy all files
2. ✅ Update branding
3. ⏳ Install dependencies
4. ⏳ Create stub files for missing dependencies
5. ⏳ Get TypeScript to compile

### Phase 2: Provider Switching

1. Wire up ProviderManager to config
2. Test switching between Gemini, Anthropic, OpenAI
3. Verify `/provider` command works
4. Verify `/model` command works

### Phase 3: Full Features

1. Enable token tracking
2. Enable performance metrics
3. Enable conversation logging
4. Test with real API keys

---

## 📝 Next Steps

1. **Install dependencies** - Add SDK packages to package.json
2. **Create stub files** - For missing dependencies (DebugLogger, telemetry, etc.)
3. **Fix imports** - Resolve any broken import paths
4. **Wire to config** - Connect ProviderManager to existing config system
5. **Test compilation** - Run `npm run build`
6. **Add provider registration** - Initialize providers on startup
7. **Test UI** - Try `/provider` and `/model` commands
8. **Refactor dialogs** - Create unified SelectionDialog component

---

## 🔍 File Structure

```
packages/
├── core/
│   └── src/
│       └── providers/
│           ├── anthropic/
│           │   └── AnthropicProvider.ts
│           ├── openai/
│           │   ├── OpenAIProvider.ts
│           │   └── [22 support files]
│           ├── gemini/
│           │   └── [keep existing]
│           ├── logging/
│           │   ├── ProviderPerformanceTracker.ts
│           │   └── ProviderContentExtractor.ts
│           ├── tokenizers/
│           │   ├── ITokenizer.ts
│           │   ├── AnthropicTokenizer.ts
│           │   └── OpenAITokenizer.ts
│           ├── types/
│           │   └── IProviderConfig.ts
│           ├── BaseProvider.ts
│           ├── ProviderManager.ts
│           ├── LoggingProviderWrapper.ts
│           └── [interfaces and utilities]
└── cli/
    └── src/
        └── ui/
            ├── components/
            │   ├── ProviderDialog.tsx
            │   └── ProviderModelDialog.tsx
            └── commands/
                ├── providerCommand.ts
                └── modelCommand.ts
```

---

## 💡 Recommendations

1. **Start small** - Get one provider (Anthropic) working first
2. **Stub dependencies** - Create minimal implementations of missing files
3. **Incremental testing** - Test each provider as you add it
4. **Refactor later** - Get it working first, then refactor the two dialogs into one
5. **Keep Gemini** - Don't break existing Gemini functionality

---

## 🚨 Known Issues to Address

1. **Missing DebugLogger** - Need to create or adapt from existing logging
2. **Missing telemetry system** - Can stub out initially
3. **Missing OAuth manager** - Can disable OAuth support for MVP
4. **Import path mismatches** - May need to adjust relative imports
5. **Config integration** - Need to wire provider config to existing config system

---

Generated: 2025-09-30
Status: Files copied, branding updated, ready for integration
