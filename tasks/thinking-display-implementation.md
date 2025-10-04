# Task: Implement Thinking/Reasoning Display in Chat UI

## Status: Partially Complete - Infrastructure Ready

## Overview

Implement visual display of AI model thinking/reasoning in the chat interface. Both Gemini and Anthropic support internal reasoning that should be visible to users in a collapsible/bordered format similar to tool execution displays.

---

## Background Research (via Perplexity)

### Gemini Thinking Format

- **API Parameter**: `thinkingConfig: { includeThoughts: true }`
- **Response Structure**: Parts with `thought: true` property

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          { "text": "Reasoning...", "thought": true },
          { "text": "Final answer" }
        ]
      }
    }
  ]
}
```

- **Optional Field**: `thoughtSignature` - encrypted representation for multi-turn context

### Anthropic Thinking Format

- **API Parameter**:

```json
{
  "thinking": {
    "type": "enabled",
    "budget_tokens": 10000
  }
}
```

- **Response Structure**: Content blocks with `type: "thinking"`

```json
{
  "content": [
    { "type": "thinking", "thinking": "Reasoning...", "signature": "..." },
    { "type": "text", "text": "Final answer" }
  ]
}
```

### UI Display Patterns (from research)

- **Bordered boxes** (ASCII art or library-based like Ink)
- **Color coding** (dim/muted for thinking vs regular text)
- **Collapsible sections** (optional, requires TUI library support)
- **Prefixes** like "💭 Thinking" or ">> Reasoning:"

---

## ✅ Completed Work

### 1. Core Infrastructure

**File: `packages/core/src/core/alfredChat.ts`**

- ✅ Added `stripThoughtsFromHistory()` method (lines 593-628)
  - Handles both Gemini (`thought: true`, `thoughtSignature`) and Anthropic (`type: 'thinking'`)
  - Used for loading old history files to remove thoughts
- ✅ Updated `isThoughtContent()` method (lines 1168-1196)
  - Detects both provider formats
  - Used in `recordHistory()` to filter thoughts (line 1055-1056)

**File: `packages/core/src/core/client.ts`**

- ✅ Added `stripThoughtsFromHistory()` wrapper method (lines 182-184)

**File: `packages/cli/src/ui/hooks/slashCommandProcessor.ts`**

- ✅ Restored call to `stripThoughtsFromHistory()` when loading history (line 365)

### 2. UI Components

**File: `packages/cli/src/ui/components/messages/ThinkingMessage.tsx`** (NEW)

- ✅ Created component with bordered box design
- ✅ Uses `borderStyle="round"` and muted colors
- ✅ Displays "💭 Thinking" header
- ✅ Truncates long text with ellipsis

**File: `packages/cli/src/ui/types.ts`**

- ✅ Added `THINKING` to MessageType enum (line 253)
- ✅ Added `HistoryItemThinking` type (lines 100-103)
- ✅ Added to `HistoryItemWithoutId` union (line 228)

**File: `packages/cli/src/ui/components/HistoryItemDisplay.tsx`**

- ✅ Imported `ThinkingMessage` component (line 18)
- ✅ Added rendering logic for thinking type (lines 88-93)

---

## 🚧 Remaining Implementation Tasks

### Phase 1: Enable Anthropic Thinking in API

**File: `packages/core/src/providers/anthropic/AnthropicProvider.ts`**

#### Task 1.1: Add Thinking Configuration

**Location:** Around line 447 (in `requestBody` construction)

**Current code:**

```typescript
const requestBody = {
  model: currentModel,
  messages: anthropicMessages,
  max_tokens: this.getMaxTokensForModel(currentModel),
  stream: streamingEnabled,
  ...(this.getModelParams() || {}),
  // ... system prompt logic
  ...(anthropicTools && anthropicTools.length > 0
    ? { tools: anthropicTools }
    : {}),
};
```

**Add:**

```typescript
const requestBody = {
  model: currentModel,
  messages: anthropicMessages,
  max_tokens: this.getMaxTokensForModel(currentModel),
  stream: streamingEnabled,
  ...(this.getModelParams() || {}),
  // Add thinking configuration
  thinking: {
    type: 'enabled',
    budget_tokens: this.getThinkingBudgetTokens(),
  },
  // ... rest of config
};
```

#### Task 1.2: Add Settings Support for Thinking Budget

**File: `packages/core/src/settings/types.ts`**

Add to provider settings interface:

```typescript
export interface ProviderSettings {
  model?: string;
  baseUrl?: string;
  thinkingBudgetTokens?: number; // NEW
  // ... other settings
}
```

**File: `packages/core/src/providers/anthropic/AnthropicProvider.ts`**

Add method:

```typescript
private getThinkingBudgetTokens(): number {
  try {
    const settingsService = getSettingsService();
    const providerSettings = settingsService.getProviderSettings(this.name);
    return (providerSettings.thinkingBudgetTokens as number) || 10000; // Default 10k
  } catch {
    return 10000;
  }
}
```

#### Task 1.3: Process Thinking Blocks in Streaming

**Location:** Around line 550 (streaming chunk processing)

**Current code only handles:**

- `content_block_start` with `type: 'tool_use'`
- `content_block_delta` with `type: 'text_delta'` and `type: 'input_json_delta'`

**Add thinking block handling:**

```typescript
for await (const chunk of stream) {
  if (chunk['type'] === 'content_block_start') {
    if (chunk['content_block']['type'] === 'tool_use') {
      // ... existing tool code
    } else if (chunk['content_block']['type'] === 'thinking') {
      // NEW: Handle thinking block start
      currentThinkingText = chunk['content_block']['thinking'] || '';
    }
  } else if (chunk['type'] === 'content_block_delta') {
    if (chunk['delta']['type'] === 'text_delta') {
      // ... existing text code
    } else if (chunk['delta']['type'] === 'thinking_delta') {
      // NEW: Accumulate thinking text
      currentThinkingText += chunk['delta']['thinking'];
    }
    // ... tool input code
  } else if (chunk['type'] === 'content_block_stop') {
    if (currentToolCall) {
      // ... existing tool code
    } else if (currentThinkingText) {
      // NEW: Emit thinking block
      yield {
        speaker: 'ai',
        blocks: [{
          type: 'thinking',
          thinking: currentThinkingText,
        }],
      } as IContent;
      currentThinkingText = '';
    }
  }
}
```

**Add variable at top of streaming function:**

```typescript
let currentThinkingText = '';
```

---

### Phase 2: Modify Core Streaming to Keep Thoughts

**File: `packages/core/src/core/alfredChat.ts`**

#### Task 2.1: Separate Thought Recording from Filtering

**Current issue:** Line 1055-1056 filters out ALL thoughts during `recordHistory()`

**Current code:**

```typescript
// Part 2: Handle the model's part of the turn, filtering out thoughts.
const nonThoughtModelOutput = modelOutput.filter(
  (content) => !this.isThoughtContent(content),
);
```

**Change to:**

```typescript
// Part 2: Handle the model's part of the turn
// Separate thoughts from regular output for different handling
const thoughtContents: Content[] = [];
const nonThoughtModelOutput: Content[] = [];

for (const content of modelOutput) {
  if (this.isThoughtContent(content)) {
    thoughtContents.push(content);
  } else {
    nonThoughtModelOutput.push(content);
  }
}

// Record thoughts separately (they will be displayed in UI)
for (const thought of thoughtContents) {
  this.recordThoughtFromContent(thought);
  // Add to history service as thinking content
  const thoughtIContent = ContentConverters.toIContent(
    thought,
    this.historyService.getIdGeneratorCallback(),
  );
  this.historyService.add(thoughtIContent, currentModel);
}
```

#### Task 2.2: Update ContentConverters to Handle Thinking

**File: `packages/core/src/services/history/ContentConverters.ts`**

The `toIContent` method needs to recognize thinking blocks and preserve them with proper type.

**Check around line 109** where thoughts are currently handled:

```typescript
if (part && typeof part === 'object' && 'thought' in part) {
  // Currently creates a thought block
}
```

**Ensure Anthropic thinking is also converted:**

```typescript
if (part && typeof part === 'object') {
  if ('thought' in part) {
    // Gemini thought
    blocks.push({
      type: 'thinking',
      text: part.text || '',
    });
  } else if ('type' in part && part.type === 'thinking') {
    // Anthropic thinking
    blocks.push({
      type: 'thinking',
      text: part.thinking || '',
    });
  }
}
```

---

### Phase 3: UI Streaming Integration

**File: `packages/cli/src/ui/hooks/useGeminiStream.ts`**

#### Task 3.1: Handle Thinking Blocks from Stream

**Location:** Around line 420-430 (where chunks are processed)

**Add thinking block detection:**

```typescript
// Check if this chunk contains thinking content
const hasThinking = chunk.candidates?.[0]?.content?.parts?.some(
  (part) =>
    part &&
    typeof part === 'object' &&
    ('thought' in part || part.type === 'thinking'),
);

if (hasThinking) {
  // Extract thinking text
  const thinkingPart = chunk.candidates[0].content.parts.find(
    (part) =>
      part &&
      typeof part === 'object' &&
      ('thought' in part || part.type === 'thinking'),
  );

  const thinkingText = thinkingPart.text || thinkingPart.thinking || '';

  // Add as separate thinking message
  addItem({ type: 'thinking', text: thinkingText }, userMessageTimestamp);
}
```

**Or** if using IContent from providers:

```typescript
// In the stream processing, check for thinking blocks
if (chunk.blocks?.some((block) => block.type === 'thinking')) {
  const thinkingBlock = chunk.blocks.find((b) => b.type === 'thinking');
  if (thinkingBlock && 'thinking' in thinkingBlock) {
    addItem(
      { type: 'thinking', text: thinkingBlock.thinking },
      userMessageTimestamp,
    );
  }
}
```

---

### Phase 4: Settings UI (Optional Enhancement)

**File: `packages/cli/src/config/settings.ts`**

Add provider-specific thinking settings:

```typescript
export interface Settings {
  // ... existing settings
  providers?: {
    anthropic?: {
      thinkingBudgetTokens?: number;
      showThinking?: boolean; // Toggle to show/hide thinking
    };
    gemini?: {
      includeThoughts?: boolean;
      showThinking?: boolean;
    };
  };
}
```

**Add CLI flags:**

```bash
alfred --anthropic-thinking-budget 15000
alfred --show-thinking
alfred --hide-thinking
```

---

## Testing Checklist

### Unit Tests to Add/Update

1. **`packages/core/src/core/alfredChat.test.ts`**
   - ✅ Test at line 1782 exists but needs update for new implementation
   - ✅ Update test: "should strip thoughts when handling 'load_history' action" (line 437)
   - ❌ Add test: "should record thinking blocks separately from regular output"
   - ❌ Add test: "should handle Anthropic thinking blocks"

2. **`packages/core/src/providers/anthropic/AnthropicProvider.test.ts`** (NEW)
   - ❌ Test thinking configuration in requestBody
   - ❌ Test thinking block streaming
   - ❌ Test thinking budget tokens from settings

3. **`packages/cli/src/ui/hooks/slashCommandProcessor.test.ts`**
   - ✅ Mock at line 411, 440 exists
   - ✅ Test at line 467 expects `stripThoughtsFromHistory` to be called
   - ❌ Add test for Anthropic thinking format

4. **`packages/cli/src/ui/components/messages/ThinkingMessage.test.tsx`** (NEW)
   - ❌ Test component rendering
   - ❌ Test text truncation
   - ❌ Test border styling

### Integration Tests

1. **E2E Test: Gemini with Thinking**
   - ❌ Enable thoughts in Gemini request
   - ❌ Verify thinking appears in UI as separate bordered message
   - ❌ Verify thinking is filtered when loading history

2. **E2E Test: Anthropic with Thinking**
   - ❌ Enable thinking in Anthropic request
   - ❌ Verify thinking blocks appear in UI
   - ❌ Verify thinking is filtered when loading history

### Manual Testing Steps

1. **Test Gemini Thinking:**

   ```bash
   # Start alfred with Gemini
   alfred --model gemini-2.5-pro

   # Ask complex reasoning question
   > "Calculate the prime factors of 1234567"

   # Expected: See "💭 Thinking" bordered box before answer
   ```

2. **Test Anthropic Thinking:**

   ```bash
   # Start alfred with Anthropic
   alfred --provider anthropic --model claude-sonnet-4-latest

   # Ask reasoning question
   > "Explain the halting problem step by step"

   # Expected: See "💭 Thinking" bordered box before answer
   ```

3. **Test History Loading:**

   ```bash
   # After chat with thinking, load history
   /history load

   # Expected: Thinking should be stripped, not shown in loaded history
   ```

---

## Implementation Priority

### Must Have (P0)

1. ✅ Infrastructure for stripping thoughts (DONE)
2. ✅ UI component for thinking display (DONE)
3. ❌ Enable Anthropic thinking in API (Phase 1)
4. ❌ Process thinking blocks in streaming (Phase 1.3)

### Should Have (P1)

5. ❌ Keep thoughts in recordHistory for display (Phase 2)
6. ❌ UI integration for thinking display (Phase 3)
7. ❌ Settings for thinking budget tokens (Phase 1.2)

### Nice to Have (P2)

8. ❌ Toggle to show/hide thinking in settings (Phase 4)
9. ❌ Collapsible thinking blocks (requires TUI enhancement)
10. ❌ Different colors per provider

---

## Files to Modify Summary

### Core Provider Changes

- [ ] `packages/core/src/providers/anthropic/AnthropicProvider.ts` - Enable thinking API
- [ ] `packages/core/src/core/alfredChat.ts` - Keep thoughts instead of filtering
- [ ] `packages/core/src/services/history/ContentConverters.ts` - Handle thinking blocks

### UI Changes

- [ ] `packages/cli/src/ui/hooks/useGeminiStream.ts` - Stream thinking to UI
- [ ] `packages/core/src/settings/types.ts` - Add thinking settings

### Testing

- [ ] `packages/core/src/core/alfredChat.test.ts` - Update existing tests
- [ ] `packages/core/src/providers/anthropic/AnthropicProvider.test.ts` - New tests
- [ ] `packages/cli/src/ui/components/messages/ThinkingMessage.test.tsx` - New tests

---

## Reference Implementation Examples

### Example: Gemini Thinking in History

```typescript
// In recordHistory, instead of filtering:
for (const content of modelOutput) {
  if (this.isThoughtContent(content)) {
    // Add as thinking type to history
    this.historyService.add(
      {
        speaker: 'ai',
        blocks: [
          {
            type: 'thinking',
            text: content.parts[0].text,
          },
        ],
      },
      currentModel,
    );
  }
}
```

### Example: Anthropic Thinking in Stream Processing

```typescript
// In AnthropicProvider streaming:
else if (chunk['content_block']['type'] === 'thinking') {
  yield {
    speaker: 'ai',
    blocks: [{
      type: 'thinking',
      thinking: chunk['content_block']['thinking']
    }]
  } as IContent;
}
```

---

## Known Issues & Gotchas

1. **Performance:** Large thinking blocks could slow down streaming
   - **Solution:** Truncate or paginate thinking display

2. **History Size:** Thoughts increase conversation history size
   - **Solution:** `stripThoughtsFromHistory()` already handles this for loaded files

3. **Provider Differences:** Gemini and Anthropic have different formats
   - **Solution:** `isThoughtContent()` already handles both

4. **UI Rendering:** Ink may have issues with rapid re-renders
   - **Solution:** Use same pattern as ToolGroupMessage (already proven stable)

---

## Success Criteria

- [ ] Anthropic thinking blocks appear in chat UI with bordered box
- [ ] Gemini thoughts appear in chat UI with bordered box
- [ ] Thinking is visually distinct from regular responses (muted color, border)
- [ ] Loaded history does NOT show thinking (stripped correctly)
- [ ] New chat sessions DO show thinking in real-time
- [ ] Settings allow configuring thinking budget tokens
- [ ] All tests pass
- [ ] No performance degradation in streaming

---

## Additional Resources

- Anthropic Extended Thinking Docs: https://docs.claude.com/en/docs/build-with-claude/extended-thinking
- Gemini Thinking Docs: https://ai.google.dev/gemini-api/docs/thinking
- AWS Claude Thinking: https://docs.aws.amazon.com/bedrock/latest/userguide/claude-messages-extended-thinking.html
