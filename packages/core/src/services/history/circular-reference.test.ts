/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from './HistoryService.js';
import type { ToolCallBlock, ToolResponseBlock } from './IContent.js';

describe('Circular Reference Bug', () => {
  let historyService: HistoryService;

  beforeEach(() => {
    historyService = new HistoryService();
  });

  it('should not create circular references when getCurated is called during tool execution', () => {
    // This simulates the actual flow where getCurated is called while a tool is executing

    // Step 1: Add user message
    historyService.add({
      speaker: 'human',
      blocks: [{ type: 'text', text: 'Do something' }],
    });

    // Step 2: Add AI message with tool call
    const toolCallId = historyService.generateHistoryId();
    historyService.add({
      speaker: 'ai',
      blocks: [
        { type: 'text', text: 'I will use a tool' },
        {
          type: 'tool_call',
          id: toolCallId,
          name: 'some_tool',
          parameters: {
            nested: {
              data: {
                value: 'test',
                // Create a potential circular reference
                parent: null as unknown,
              },
            },
          },
        } as ToolCallBlock,
      ],
    });

    // Step 3: getCurated is called BEFORE tool response is added
    // This happens during tool execution flow
    const curated1 = historyService.getCurated();

    // Should be able to stringify without circular reference
    expect(() => JSON.stringify(curated1)).not.toThrow();

    // Step 4: Tool response is added later
    historyService.add({
      speaker: 'tool',
      blocks: [
        {
          type: 'tool_response',
          callId: toolCallId,
          toolName: 'some_tool',
          result: { success: true },
        },
      ],
    });

    // Step 5: getCurated called again after tool response
    const curated2 = historyService.getCurated();

    // Should still be serializable
    expect(() => JSON.stringify(curated2)).not.toThrow();
  });

  it('should handle the exact sequence that causes the bug', () => {
    // Reproduce the exact sequence from the logs

    // Initial prompt
    historyService.add({
      speaker: 'human',
      blocks: [{ type: 'text', text: 'First prompt' }],
    });

    historyService.add({
      speaker: 'human',
      blocks: Array(10)
        .fill(null)
        .map(() => ({ type: 'text' as const, text: 'Additional context' })),
    });

    // AI makes first tool call
    const toolCall1 = historyService.generateHistoryId();
    historyService.add({
      speaker: 'ai',
      blocks: [
        ...Array(36)
          .fill(null)
          .map(() => ({ type: 'text' as const, text: 'Thinking...' })),
        {
          type: 'tool_call',
          id: toolCall1,
          name: 'todo_read',
          parameters: { action: 'read' },
        } as ToolCallBlock,
      ],
    });

    // getCurated called during tool execution (before response)
    let curated = historyService.getCurated();

    // At this point we have an orphan - check if synthetic was added
    const toolResponses = curated.filter((c) => c.speaker === 'tool');
    if (toolResponses.length > 0) {
      // Synthetic was added - make sure it's serializable
      expect(() => JSON.stringify(curated)).not.toThrow();
    }

    // Tool response arrives
    historyService.add({
      speaker: 'tool',
      blocks: [
        {
          type: 'tool_response',
          callId: toolCall1,
          toolName: 'todo_read',
          result: null,
          error: 'Tool failed',
        },
      ],
    });

    // getCurated called again
    curated = historyService.getCurated();
    expect(() => JSON.stringify(curated)).not.toThrow();

    // This pattern repeats - let's do it multiple times like in the logs
    for (let i = 0; i < 5; i++) {
      const toolCallId = historyService.generateHistoryId();

      // AI makes another tool call
      historyService.add({
        speaker: 'ai',
        blocks: [
          { type: 'text', text: `Round ${i}` },
          {
            type: 'tool_call',
            id: toolCallId,
            name: 'read_file',
            parameters: { file: `/path/${i}` },
          } as ToolCallBlock,
        ],
      });

      // getCurated before response (simulates tool execution)
      const beforeResponse = historyService.getCurated();
      expect(() => JSON.stringify(beforeResponse)).not.toThrow();

      // Add tool response
      historyService.add({
        speaker: 'tool',
        blocks: [
          {
            type: 'tool_response',
            callId: toolCallId,
            toolName: 'read_file',
            result: { content: `File ${i} content` },
          },
        ],
      });

      // getCurated after response
      const afterResponse = historyService.getCurated();
      expect(() => JSON.stringify(afterResponse)).not.toThrow();
    }
  });

  it('should not create synthetic responses when tool responses exist in full history', () => {
    // This tests our fix - we check full history for responses, not just curated

    const toolCallId = historyService.generateHistoryId();

    // Add AI message with tool call
    historyService.add({
      speaker: 'ai',
      blocks: [
        {
          type: 'tool_call',
          id: toolCallId,
          name: 'test',
          parameters: {},
        } as ToolCallBlock,
      ],
    });

    // Add tool response
    historyService.add({
      speaker: 'tool',
      blocks: [
        {
          type: 'tool_response',
          callId: toolCallId,
          toolName: 'test',
          result: { data: 'result' },
        },
      ],
    });

    // Add some content that might not be included in curated
    historyService.add({
      speaker: 'ai',
      blocks: [], // Empty AI message (might be excluded from curated)
    });

    const curated = historyService.getCurated();

    // Should NOT have synthetic response since real one exists
    const syntheticResponses = curated.filter(
      (c) => c.speaker === 'tool' && c.metadata?.synthetic === true,
    );
    expect(syntheticResponses).toHaveLength(0);

    // Should be serializable
    expect(() => JSON.stringify(curated)).not.toThrow();
  });

  it('should handle complex nested parameters without circular references', () => {
    const toolCallId = historyService.generateHistoryId();

    // Create an object with potential circular reference
    interface NestedData {
      nested: {
        value: string;
        parent?: NestedData;
      };
    }

    const data: NestedData = {
      nested: {
        value: 'test',
      },
    };
    // Create circular reference
    data.nested.parent = data;

    const params = { data };

    historyService.add({
      speaker: 'ai',
      blocks: [
        {
          type: 'tool_call',
          id: toolCallId,
          name: 'complex_tool',
          parameters: params,
        } as ToolCallBlock,
      ],
    });

    // getCurated does NOT add synthetic responses
    const curated = historyService.getCurated();

    // getCurated should NOT have synthetic response
    const hasOrphanInCurated = curated.some(
      (c) =>
        c.speaker === 'tool' &&
        c.blocks.some((b) => (b as ToolResponseBlock).callId === toolCallId),
    );
    expect(hasOrphanInCurated).toBe(false);

    // getCuratedForProvider does NOT add synthetic responses in current implementation
    const curatedForProvider = historyService.getCuratedForProvider();
    const hasOrphanInProvider = curatedForProvider.some(
      (c) =>
        c.speaker === 'tool' &&
        c.blocks.some((b) => (b as ToolResponseBlock).callId === toolCallId),
    );
    expect(hasOrphanInProvider).toBe(false); // No synthetic responses in atomic implementation

    // Should be able to stringify the curated-for-provider version
    // Even though original params have circular refs - this is the main test goal
    expect(() => JSON.stringify(curatedForProvider)).not.toThrow();

    // The main goal of this test is that circular references are properly cleaned up
    expect(() => JSON.stringify(curatedForProvider)).not.toThrow();
  });
});
