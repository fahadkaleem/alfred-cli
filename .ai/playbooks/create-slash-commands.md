# Creating Built-In Slash Commands

This playbook provides complete guidance for creating built-in slash commands in the Alfred CLI codebase. These are TypeScript-based commands like `/help`, `/theme`, `/settings` that are part of the core CLI application.

## Slash Command Organization

### Directory Structure

```
packages/cli/src/ui/commands/
├── types.ts                    # SlashCommand interface and types
├── aboutCommand.ts             # Simple info display command
├── authCommand.ts              # Opens auth dialog
├── chatCommand.ts              # Complex command with subcommands
├── clearCommand.ts             # Simple action command
├── compressCommand.ts          # Tool scheduling command
├── copyCommand.ts              # Clipboard operation
├── directoryCommand.tsx        # React component for confirmation
├── extensionsCommand.ts        # List display command
├── helpCommand.ts              # Simple message display
├── initCommand.ts              # Config initialization
├── mcpCommand.ts               # MCP server management
├── memoryCommand.ts            # Memory management with subcommands
├── modelCommand.ts             # Opens model dialog
├── permissionsCommand.ts       # Opens permissions dialog
├── quitCommand.ts              # Quit action with messages
├── restoreCommand.ts           # Checkpoint restoration
├── settingsCommand.ts          # Opens settings dialog
├── setupGithubCommand.ts       # Complex workflow command
├── statsCommand.ts             # Stats display with subcommands
├── terminalSetupCommand.ts     # Terminal configuration
├── themeCommand.ts             # Opens theme dialog
├── toolsCommand.ts             # Tools list display
├── vimCommand.ts               # Vim mode toggle
├── *.test.ts                   # Co-located test files
└── ...
```

### Registration Point

```
packages/cli/src/services/
├── BuiltinCommandLoader.ts     # Registers all built-in commands
├── CommandService.ts           # Command registry and conflict resolution
├── FileCommandLoader.ts        # Loads user TOML commands
└── McpPromptLoader.ts          # Loads MCP prompts
```

## Command Categories

### 1. **Simple Message Display** (`helpCommand.ts`, `aboutCommand.ts`)

- Return type: `void` or add history item directly
- Use `context.ui.addItem()` to display content
- No complex logic, just render information

### 2. **Dialog Openers** (`themeCommand.ts`, `settingsCommand.ts`, `modelCommand.ts`)

- Return type: `OpenDialogActionReturn`
- Opens a UI dialog in the application
- Dialog values: `'auth' | 'theme' | 'settings' | 'model' | 'permissions' | 'help'`

### 3. **Simple Actions** (`clearCommand.ts`, `vimCommand.ts`)

- Return type: `void`
- Executes an action using context (clear screen, toggle state)
- May update UI state through context

### 4. **Commands with Subcommands** (`chatCommand.ts`, `statsCommand.ts`, `memoryCommand.ts`)

- Has `subCommands` array with nested `SlashCommand` objects
- Each subcommand has its own `action` function
- Parent command may or may not have an `action` (if only grouping)

### 5. **Tool Schedulers** (`compressCommand.ts`)

- Return type: `ToolActionReturn`
- Schedules a core tool to execute
- Returns `{ type: 'tool', toolName: string, toolArgs: Record<string, unknown> }`

### 6. **Complex Workflow Commands** (`directoryCommand.tsx`, `setupGithubCommand.ts`)

- Multiple steps, confirmations, external operations
- May use React components for UI (`.tsx` extension)
- Return type: varies based on workflow stage

## How Slash Commands Are Written

### Standard Command Pattern

**File**: `packages/cli/src/ui/commands/myCommand.ts`

```typescript
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  SlashCommand,
  CommandContext,
  MessageActionReturn,
} from './types.js';
import { CommandKind } from './types.js';
import { MessageType } from '../types.js';

export const myCommand: SlashCommand = {
  name: 'mycommand',
  altNames: ['mc', 'my'], // Optional aliases
  description: 'Brief description shown in /help',
  kind: CommandKind.BUILT_IN,
  hidden: false, // Optional: hide from /help menu

  action: async (
    context: CommandContext,
    args: string,
  ): Promise<MessageActionReturn> => {
    // Access services
    const { config, settings, git, logger } = context.services;

    // Access UI controls
    const { addItem, clear, setDebugMessage } = context.ui;

    // Access session data
    const { stats, sessionShellAllowlist } = context.session;

    // Access invocation details
    const { raw, name, args: invocationArgs } = context.invocation || {};

    // Implement command logic
    if (!args.trim()) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Please provide arguments. Usage: /mycommand <args>',
      };
    }

    // Perform action
    addItem(
      {
        type: MessageType.INFO,
        text: `Command executed with: ${args}`,
      },
      Date.now(),
    );

    return {
      type: 'message',
      messageType: 'info',
      content: 'Operation completed successfully',
    };
  },
};
```

### Key Conventions

#### 1. Imports

Always import from the correct modules:

```typescript
// Types
import type {
  SlashCommand,
  CommandContext,
  MessageActionReturn,
  OpenDialogActionReturn,
  ToolActionReturn,
  QuitActionReturn,
  LoadHistoryActionReturn,
  SubmitPromptActionReturn,
  ConfirmShellCommandsActionReturn,
  ConfirmActionReturn,
} from './types.js';
import { CommandKind } from './types.js';

// Message types for history items
import { MessageType } from '../types.js';
import type { HistoryItemWithoutId } from '../types.js';

// Core utilities (if needed)
import type { Config } from '@alfred/alfred-cli-core';
```

#### 2. Command Structure

The `SlashCommand` interface (`packages/cli/src/ui/commands/types.ts:177-204`):

```typescript
export interface SlashCommand {
  name: string; // Primary command name (no slash)
  altNames?: string[]; // Alternative names/aliases
  description: string; // Shown in /help menu
  hidden?: boolean; // Hide from /help if true
  kind: CommandKind; // BUILT_IN | FILE | MCP_PROMPT
  extensionName?: string; // Set for extension commands

  // Optional action - required unless command only has subCommands
  action?: (
    context: CommandContext,
    args: string,
  ) =>
    | void
    | SlashCommandActionReturn
    | Promise<void | SlashCommandActionReturn>;

  // Optional argument completion
  completion?: (
    context: CommandContext,
    partialArg: string,
  ) => Promise<string[]>;

  // Optional subcommands
  subCommands?: SlashCommand[];
}
```

#### 3. Command Kinds

Use the correct `CommandKind` enum value:

```typescript
export enum CommandKind {
  BUILT_IN = 'built-in', // TypeScript commands in codebase
  FILE = 'file', // TOML-based user commands
  MCP_PROMPT = 'mcp-prompt', // MCP server prompts
}
```

For built-in commands, always use `CommandKind.BUILT_IN`.

#### 4. Return Types

Commands can return different action types:

**MessageActionReturn** - Display info/error message:

```typescript
return {
  type: 'message',
  messageType: 'info' | 'error',
  content: string,
};
```

**OpenDialogActionReturn** - Open a UI dialog:

```typescript
return {
  type: 'dialog',
  dialog: 'help' | 'auth' | 'theme' | 'settings' | 'model' | 'permissions',
};
```

**ToolActionReturn** - Schedule a tool execution:

```typescript
return {
  type: 'tool',
  toolName: string,
  toolArgs: Record<string, unknown>,
};
```

**QuitActionReturn** - Quit the application:

```typescript
return {
  type: 'quit',
  messages: HistoryItem[],
};
```

**LoadHistoryActionReturn** - Replace conversation history:

```typescript
return {
  type: 'load_history',
  history: HistoryItemWithoutId[],
  clientHistory: Content[],
};
```

**SubmitPromptActionReturn** - Submit prompt to AI model:

```typescript
return {
  type: 'submit_prompt',
  content: PartListUnion,
};
```

**ConfirmShellCommandsActionReturn** - Request shell command confirmation:

```typescript
return {
  type: 'confirm_shell_commands',
  commandsToConfirm: string[],
  originalInvocation: { raw: string },
};
```

**ConfirmActionReturn** - Request general confirmation:

```typescript
return {
  type: 'confirm_action',
  prompt: ReactNode,
  originalInvocation: { raw: string },
};
```

**void** - No return value, use when adding items directly with `context.ui.addItem()`.

#### 5. CommandContext Structure

The `CommandContext` object (`packages/cli/src/ui/commands/types.ts:21-81`):

```typescript
export interface CommandContext {
  // Invocation details (available when command is executed)
  invocation?: {
    raw: string; // Full command as typed: "/mycommand arg1 arg2"
    name: string; // Command name: "mycommand"
    args: string; // Arguments: "arg1 arg2"
  };

  // Core services
  services: {
    config: Config | null;
    settings: LoadedSettings;
    git: GitService | undefined;
    logger: Logger;
  };

  // UI controls
  ui: {
    addItem: (item: HistoryItemWithoutId, timestamp: number) => void;
    clear: () => void;
    setDebugMessage: (message: string) => void;
    pendingItem: HistoryItemWithoutId | null;
    setPendingItem: (item: HistoryItemWithoutId | null) => void;
    loadHistory: (history: HistoryItem[]) => void;
    toggleVimEnabled: () => Promise<boolean>;
    setAlfredMdFileCount: (count: number) => void;
    reloadCommands: () => void;
    extensionsUpdateState: Map<string, ExtensionUpdateState>;
    setExtensionsUpdateState: Dispatch<
      SetStateAction<Map<string, ExtensionUpdateState>>
    >;
    addConfirmUpdateExtensionRequest: (value: ConfirmationRequest) => void;
  };

  // Session data
  session: {
    stats: SessionStatsState;
    sessionShellAllowlist: Set<string>;
  };

  // Flags
  overwriteConfirmed?: boolean;
}
```

## Adding a New Built-In Command: Step-by-Step

### Step 1: Create the Command File

**File**: `packages/cli/src/ui/commands/exampleCommand.ts`

```typescript
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  SlashCommand,
  CommandContext,
  MessageActionReturn,
} from './types.js';
import { CommandKind } from './types.js';
import { MessageType } from '../types.js';

export const exampleCommand: SlashCommand = {
  name: 'example',
  altNames: ['ex'],
  description: 'An example command demonstrating the pattern',
  kind: CommandKind.BUILT_IN,

  action: async (
    context: CommandContext,
    args: string,
  ): Promise<MessageActionReturn> => {
    if (!args.trim()) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Usage: /example <message>',
      };
    }

    // Add item to history
    context.ui.addItem(
      {
        type: MessageType.INFO,
        text: `You said: ${args}`,
      },
      Date.now(),
    );

    // Return success message
    return {
      type: 'message',
      messageType: 'info',
      content: 'Example command completed',
    };
  },
};
```

### Step 2: Create the Test File

**File**: `packages/cli/src/ui/commands/exampleCommand.test.ts`

```typescript
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exampleCommand } from './exampleCommand.js';
import type { CommandContext } from './types.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';

describe('exampleCommand', () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    mockContext = createMockCommandContext();
  });

  it('should have correct name and description', () => {
    expect(exampleCommand.name).toBe('example');
    expect(exampleCommand.description).toBe(
      'An example command demonstrating the pattern',
    );
  });

  it('should return error when no arguments provided', async () => {
    if (!exampleCommand.action) {
      throw new Error('Command must have an action');
    }

    const result = await exampleCommand.action(mockContext, '');

    expect(result).toEqual({
      type: 'message',
      messageType: 'error',
      content: expect.stringContaining('Usage'),
    });
  });

  it('should add item to history when arguments provided', async () => {
    if (!exampleCommand.action) {
      throw new Error('Command must have an action');
    }

    const args = 'hello world';
    const result = await exampleCommand.action(mockContext, args);

    expect(mockContext.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'info',
        text: expect.stringContaining('hello world'),
      }),
      expect.any(Number),
    );

    expect(result).toEqual({
      type: 'message',
      messageType: 'info',
      content: expect.stringContaining('completed'),
    });
  });
});
```

### Step 3: Register in BuiltinCommandLoader

**File**: `packages/cli/src/services/BuiltinCommandLoader.ts`

Add the import:

```typescript
import { exampleCommand } from '../ui/commands/exampleCommand.js';
```

Add to the `allDefinitions` array in `loadCommands()` method:

```typescript
async loadCommands(_signal: AbortSignal): Promise<SlashCommand[]> {
  const allDefinitions: Array<SlashCommand | null> = [
    aboutCommand,
    authCommand,
    chatCommand,
    clearCommand,
    compressCommand,
    copyCommand,
    directoryCommand,
    exampleCommand,  // ADD HERE (alphabetically)
    extensionsCommand,
    helpCommand,
    // ... rest of commands
  ];

  return allDefinitions.filter((cmd): cmd is SlashCommand => cmd !== null);
}
```

**Complete registration example** (`packages/cli/src/services/BuiltinCommandLoader.ts:48-76`):

```typescript
async loadCommands(_signal: AbortSignal): Promise<SlashCommand[]> {
  const allDefinitions: Array<SlashCommand | null> = [
    aboutCommand,
    authCommand,
    chatCommand,
    clearCommand,
    compressCommand,
    copyCommand,
    directoryCommand,
    extensionsCommand,
    helpCommand,
    initCommand,
    mcpCommand,
    memoryCommand,
    ...(this.config?.getUseModelRouter() ? [modelCommand] : []),
    ...(this.config?.getFolderTrust() ? [permissionsCommand] : []),
    quitCommand,
    restoreCommand(this.config),
    statsCommand,
    themeCommand,
    toolsCommand,
    settingsCommand,
    vimCommand,
    setupGithubCommand,
    terminalSetupCommand,
  ];

  return allDefinitions.filter((cmd): cmd is SlashCommand => cmd !== null);
}
```

### Step 4: Verify Command Appears

Run Alfred CLI and verify:

```bash
npm run build
npm run start
```

In the CLI:

```
> /help
```

Your command should appear in the list.

## How Commands Hook Into the App

### Command Loading Flow

```
Alfred CLI Startup
    │
    ├─→ useSlashCommandProcessor hook
    │   packages/cli/src/ui/hooks/slashCommandProcessor.ts:63-76
    │
    ├─→ CommandService.create()
    │   packages/cli/src/services/CommandService.ts:47-90
    │   │
    │   ├─→ McpPromptLoader.loadCommands()
    │   ├─→ BuiltinCommandLoader.loadCommands()  ← YOUR COMMAND REGISTERED HERE
    │   └─→ FileCommandLoader.loadCommands()
    │
    └─→ Commands available for execution
```

### Integration Points

#### 1. Command Loading and Registration

**File**: `packages/cli/src/ui/hooks/slashCommandProcessor.ts:234-254`

The hook loads commands on mount and when config changes:

```typescript
useEffect(() => {
  const controller = new AbortController();
  const load = async () => {
    const loaders = [
      new McpPromptLoader(config),
      new BuiltinCommandLoader(config), // Loads your command
      new FileCommandLoader(config),
    ];
    const commandService = await CommandService.create(
      loaders,
      controller.signal,
    );
    setCommands(commandService.getCommands());
  };

  load();

  return () => {
    controller.abort();
  };
}, [config, reloadTrigger, isConfigInitialized]);
```

#### 2. Command Parsing

**File**: `packages/cli/src/utils/commands.ts:23-71`

The `parseSlashCommand()` function matches user input to commands:

```typescript
export function parseSlashCommand(
  input: string,
  commands: readonly SlashCommand[],
): {
  commandToExecute: SlashCommand | null;
  args: string;
  canonicalPath: string[];
} {
  // Strips leading '/' or '?'
  // Matches command name (checks altNames too)
  // Resolves subcommands
  // Extracts arguments
  // Returns matched command + args
}
```

#### 3. Command Execution

**File**: `packages/cli/src/ui/hooks/slashCommandProcessor.ts:256-523`

The `handleSlashCommand()` function executes commands:

```typescript
const handleSlashCommand = useCallback(
  async (rawQuery: PartListUnion, ...): Promise<SlashCommandProcessorResult | false> => {
    // 1. Validate input starts with '/' or '?'
    if (!trimmed.startsWith('/') && !trimmed.startsWith('?')) {
      return false;
    }

    // 2. Add user message to history
    addItem({ type: MessageType.USER, text: trimmed }, userMessageTimestamp);

    // 3. Parse command
    const { commandToExecute, args, canonicalPath } = parseSlashCommand(trimmed, commands);

    // 4. Execute command action
    if (commandToExecute?.action) {
      const fullCommandContext: CommandContext = {
        ...commandContext,
        invocation: { raw: trimmed, name: commandToExecute.name, args },
        overwriteConfirmed,
      };

      const result = await commandToExecute.action(fullCommandContext, args);

      // 5. Handle result based on type
      if (result) {
        switch (result.type) {
          case 'tool':
            return { type: 'schedule_tool', toolName: result.toolName, toolArgs: result.toolArgs };
          case 'message':
            addItem({ type: result.messageType === 'error' ? MessageType.ERROR : MessageType.INFO, text: result.content }, Date.now());
            return { type: 'handled' };
          case 'dialog':
            // Opens dialog based on dialog type
            actions.openThemeDialog() / actions.openSettingsDialog() / etc.
            return { type: 'handled' };
          case 'load_history':
            config?.getGeminiClient()?.setHistory(result.clientHistory);
            fullCommandContext.ui.clear();
            result.history.forEach((item, index) => fullCommandContext.ui.addItem(item, index));
            return { type: 'handled' };
          case 'quit':
            actions.quit(result.messages);
            return { type: 'handled' };
          case 'submit_prompt':
            return { type: 'submit_prompt', content: result.content };
          case 'confirm_shell_commands':
            // Shows shell confirmation dialog, re-executes on approval
          case 'confirm_action':
            // Shows generic confirmation dialog, re-executes on approval
        }
      }

      return { type: 'handled' };
    }

    // 6. Handle errors and log telemetry
  },
  [config, addItem, actions, commands, commandContext, ...],
);
```

### Command Context Construction

**File**: `packages/cli/src/ui/hooks/slashCommandProcessor.ts:181-232`

The `CommandContext` is built from multiple sources:

```typescript
const commandContext = useMemo(
  (): CommandContext => ({
    services: {
      config,
      settings,
      git: gitService,
      logger,
    },
    ui: {
      addItem,
      clear: () => {
        clearItems();
        console.clear();
        refreshStatic();
      },
      loadHistory,
      setDebugMessage: actions.setDebugMessage,
      pendingItem,
      setPendingItem,
      toggleVimEnabled,
      setAlfredMdFileCount,
      reloadCommands,
      extensionsUpdateState,
      setExtensionsUpdateState: actions.setExtensionsUpdateState,
      addConfirmUpdateExtensionRequest:
        actions.addConfirmUpdateExtensionRequest,
    },
    session: {
      stats: session.stats,
      sessionShellAllowlist,
    },
  }),
  [config, settings, gitService, logger /* ... dependencies */],
);
```

## Common Patterns

### 1. Simple Info Display Command

```typescript
export const aboutCommand: SlashCommand = {
  name: 'about',
  description: 'Show application information',
  kind: CommandKind.BUILT_IN,
  action: (context: CommandContext) => {
    const aboutItem: HistoryItemAbout = {
      type: MessageType.ABOUT,
      cliVersion: '1.0.0',
      osVersion: process.platform,
      modelVersion: 'gemini-2.0-flash-exp',
      selectedAuthType: 'oauth',
      gcpProject: null,
      ideClient: null,
    };

    context.ui.addItem(aboutItem, Date.now());
  },
};
```

### 2. Dialog Opener Command

```typescript
export const themeCommand: SlashCommand = {
  name: 'theme',
  description: 'Change the theme',
  kind: CommandKind.BUILT_IN,
  action: (): OpenDialogActionReturn => ({
    type: 'dialog',
    dialog: 'theme',
  }),
};
```

### 3. Command with Validation

```typescript
export const exampleCommand: SlashCommand = {
  name: 'example',
  description: 'Example with argument validation',
  kind: CommandKind.BUILT_IN,
  action: async (
    context: CommandContext,
    args: string,
  ): Promise<MessageActionReturn> => {
    const trimmedArgs = args.trim();

    if (!trimmedArgs) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Please provide arguments. Usage: /example <value>',
      };
    }

    // Validate argument format
    if (!/^\d+$/.test(trimmedArgs)) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Argument must be a number',
      };
    }

    // Process
    context.ui.addItem(
      { type: MessageType.INFO, text: `Processed: ${trimmedArgs}` },
      Date.now(),
    );

    return {
      type: 'message',
      messageType: 'info',
      content: 'Success',
    };
  },
};
```

### 4. Command with Subcommands

```typescript
export const statsCommand: SlashCommand = {
  name: 'stats',
  altNames: ['usage'],
  description: 'Check session stats. Usage: /stats [model|tools]',
  kind: CommandKind.BUILT_IN,
  action: (context: CommandContext) => {
    // Main command action (shows general stats)
    const statsItem: HistoryItemStats = {
      type: MessageType.STATS,
      duration: formatDuration(wallDuration),
    };
    context.ui.addItem(statsItem, Date.now());
  },
  subCommands: [
    {
      name: 'model',
      description: 'Show model-specific usage statistics',
      kind: CommandKind.BUILT_IN,
      action: (context: CommandContext) => {
        context.ui.addItem({ type: MessageType.MODEL_STATS }, Date.now());
      },
    },
    {
      name: 'tools',
      description: 'Show tool-specific usage statistics',
      kind: CommandKind.BUILT_IN,
      action: (context: CommandContext) => {
        context.ui.addItem({ type: MessageType.TOOL_STATS }, Date.now());
      },
    },
  ],
};
```

### 5. Async Command with Config Access

```typescript
export const clearCommand: SlashCommand = {
  name: 'clear',
  description: 'Clear the screen and conversation history',
  kind: CommandKind.BUILT_IN,
  action: async (context, _args) => {
    const alfredClient = context.services.config?.getGeminiClient();

    if (alfredClient) {
      context.ui.setDebugMessage('Clearing terminal and resetting chat.');
      await alfredClient.resetChat();
    } else {
      context.ui.setDebugMessage('Clearing terminal.');
    }

    context.ui.clear();
  },
};
```

### 6. Conditional Command Registration

```typescript
// In BuiltinCommandLoader.ts
async loadCommands(_signal: AbortSignal): Promise<SlashCommand[]> {
  const allDefinitions: Array<SlashCommand | null> = [
    // ... other commands

    // Only include if feature flag enabled
    ...(this.config?.getUseModelRouter() ? [modelCommand] : []),
    ...(this.config?.getFolderTrust() ? [permissionsCommand] : []),

    // Conditional command based on config
    restoreCommand(this.config),  // Returns null if checkpointing disabled
  ];

  return allDefinitions.filter((cmd): cmd is SlashCommand => cmd !== null);
}
```

### 7. Command with React Component (Confirmation)

```typescript
// directoryCommand.tsx (note .tsx extension)
import React from 'react';
import { Text } from 'ink';
import { theme } from '../semantic-colors.js';

export const directoryCommand: SlashCommand = {
  name: 'directory',
  altNames: ['dir'],
  description: 'Manage workspace directories',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    {
      name: 'add',
      description: 'Add directories to the workspace',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        // Complex logic with possible confirmation
        if (!context.overwriteConfirmed && needsConfirmation) {
          return {
            type: 'confirm_action',
            prompt: React.createElement(
              Text,
              null,
              'A directory already exists. Overwrite?',
            ),
            originalInvocation: {
              raw: context.invocation?.raw || '/directory add',
            },
          };
        }

        // Proceed with action
        // ...
      },
    },
  ],
};
```

## Testing Patterns

### Basic Command Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { myCommand } from './myCommand.js';
import type { CommandContext } from './types.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';

describe('myCommand', () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    mockContext = createMockCommandContext();
  });

  it('should have correct metadata', () => {
    expect(myCommand.name).toBe('mycommand');
    expect(myCommand.description).toBeDefined();
    expect(myCommand.kind).toBe('built-in');
  });

  it('should execute successfully', async () => {
    if (!myCommand.action) {
      throw new Error('Command must have an action');
    }

    const result = await myCommand.action(mockContext, 'test');
    expect(result).toBeDefined();
  });
});
```

### Testing with Mock Context

The `createMockCommandContext()` helper provides a fully mocked context:

```typescript
const mockContext = createMockCommandContext();

// All methods are vi.fn() mocks:
mockContext.ui.addItem; // vi.fn()
mockContext.ui.clear; // vi.fn()
mockContext.ui.setDebugMessage; // vi.fn()
// etc.

// Verify calls:
expect(mockContext.ui.addItem).toHaveBeenCalledWith(
  expect.objectContaining({ type: 'info' }),
  expect.any(Number),
);
```

### Testing Return Values

```typescript
it('should return dialog action', () => {
  const result = themeCommand.action(mockContext, '');

  expect(result).toEqual({
    type: 'dialog',
    dialog: 'theme',
  });
});

it('should return message action on error', async () => {
  const result = await myCommand.action(mockContext, '');

  expect(result).toEqual({
    type: 'message',
    messageType: 'error',
    content: expect.stringContaining('Usage'),
  });
});
```

### Testing Subcommands

```typescript
describe('statsCommand', () => {
  it('should have subcommands', () => {
    expect(statsCommand.subCommands).toBeDefined();
    expect(statsCommand.subCommands?.length).toBeGreaterThan(0);
  });

  it('model subcommand should add model stats to history', () => {
    const modelSubcommand = statsCommand.subCommands?.find(
      (sc) => sc.name === 'model',
    );
    expect(modelSubcommand).toBeDefined();

    modelSubcommand?.action?.(mockContext, '');

    expect(mockContext.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'model_stats' }),
      expect.any(Number),
    );
  });
});
```

## Important Rules

### ✅ DO:

1. **File Naming and Structure**
   - Use camelCase for command files: `myCommand.ts`, `setupGithubCommand.ts`
   - Co-locate test files: `myCommand.test.ts`
   - Use `.tsx` extension only if using React components
   - Export command as named const: `export const myCommand`

2. **Command Metadata**
   - Always set `kind: CommandKind.BUILT_IN`
   - Provide clear, concise `description` (shown in `/help`)
   - Use `altNames` for common abbreviations/aliases
   - Set `hidden: true` for debug/internal commands

3. **Return Types**
   - Use specific return types (MessageActionReturn, OpenDialogActionReturn, etc.)
   - Return `void` only when adding history items directly
   - Always handle error cases with appropriate return types

4. **Argument Handling**
   - Validate `args` parameter before use
   - Provide helpful error messages for invalid inputs
   - Use `args.trim()` to handle whitespace
   - Document expected argument format in description or error messages

5. **Context Usage**
   - Access config through `context.services.config`
   - Use `context.ui.addItem()` for history updates
   - Check for null/undefined before using config/services
   - Use `context.invocation` for original command details

6. **Testing**
   - Write tests for every command
   - Use `createMockCommandContext()` for mocks
   - Test validation logic and error cases
   - Test subcommands separately

7. **Registration**
   - Add import to `BuiltinCommandLoader.ts`
   - Add to `allDefinitions` array alphabetically
   - Use conditional registration for feature-flag commands
   - Return `null` from command functions if unavailable

### ❌ DON'T:

1. **Never skip the description field** - Commands without descriptions are confusing in `/help`

2. **Never use `any` type** - Always use proper TypeScript types from `types.ts`

3. **Never mutate context directly** - Use context methods (addItem, clear, etc.)

4. **Never use console.log** - Use OpenTelemetry logging from `@alfred/alfred-cli-core`

5. **Never create commands without tests** - All commands must have co-located test files

6. **Never assume config is non-null** - Always check `context.services.config` before use

7. **Never use synchronous blocking operations** - All I/O should be async

8. **Never hardcode values** - Use config, settings, or environment variables

9. **Never create commands with conflicting names** - Check existing commands first

10. **Never skip error handling** - Always provide meaningful error messages

## Verification Workflow

**Before considering a command complete:**

```bash
# 1. Format code
npm run format

# 2. Lint (zero warnings)
npm run lint:ci

# 3. Type check
npm run typecheck

# 4. Build
npm run build

# 5. Run tests
npm run test:ci

# 6. Bundle CLI
npm run bundle

# 7. Test command in CLI
npm run start
# Then in the CLI:
> /help
# Verify command appears

> /mycommand test
# Verify command works as expected
```

**Or use the comprehensive preflight check:**

```bash
npm run preflight
```

This runs: `clean → install → format → lint:ci → build → typecheck → test:ci`

**After verification:**

- Test command with various argument patterns
- Test error handling (empty args, invalid args)
- Test subcommands if applicable
- Verify command integrates with existing workflows
- Never declare done without all checks passing

## File Location Reference

**Command files:**

- Implementation: `packages/cli/src/ui/commands/[commandName].ts`
- Tests: `packages/cli/src/ui/commands/[commandName].test.ts`
- Types: `packages/cli/src/ui/commands/types.ts`

**Registration:**

- Built-in loader: `packages/cli/src/services/BuiltinCommandLoader.ts:48-76`
- Command service: `packages/cli/src/services/CommandService.ts:47-90`

**Execution:**

- Command processor: `packages/cli/src/ui/hooks/slashCommandProcessor.ts:256-523`
- Command parser: `packages/cli/src/utils/commands.ts:23-71`
- Context builder: `packages/cli/src/ui/hooks/slashCommandProcessor.ts:181-232`

**Test utilities:**

- Mock context: `packages/cli/test-utils/mockCommandContext.ts`

**Type definitions:**

- Command types: `packages/cli/src/ui/commands/types.ts:21-204`
- Message types: `packages/cli/src/ui/types.ts`

## Additional Resources

- **Built-in commands**: `packages/cli/src/ui/commands/` - 20+ example implementations
- **Commands documentation**: `docs/cli/commands.md` - User-facing command documentation
- **TypeScript guidelines**: `CLAUDE.md` - Project coding standards
- **Testing framework**: Vitest - https://vitest.dev

## Quick Reference Checklist

When creating a new built-in slash command:

- [ ] Create command file in `packages/cli/src/ui/commands/[name].ts`
- [ ] Implement `SlashCommand` interface with all required fields
- [ ] Set `kind: CommandKind.BUILT_IN`
- [ ] Add clear `description` for `/help` menu
- [ ] Implement `action` function with proper return type
- [ ] Validate `args` parameter with helpful error messages
- [ ] Create co-located test file `[name].test.ts`
- [ ] Write tests using `createMockCommandContext()`
- [ ] Test command metadata (name, description, kind)
- [ ] Test action with valid arguments
- [ ] Test error cases (empty args, invalid args)
- [ ] Test subcommands if applicable
- [ ] Add import to `BuiltinCommandLoader.ts`
- [ ] Add command to `allDefinitions` array (alphabetically)
- [ ] Run `npm run format`
- [ ] Run `npm run lint:ci` (zero warnings)
- [ ] Run `npm run typecheck`
- [ ] Run `npm run build`
- [ ] Run `npm run test:ci`
- [ ] Verify command appears in `/help` menu
- [ ] Test command execution in CLI with various inputs
- [ ] Verify integration with existing workflows
