# Creating Components in Alfred CLI

This playbook provides complete guidance for creating new UI components in the Alfred CLI codebase.

## Component Organization

### Directory Structure

```
packages/cli/src/ui/
├── components/           # Main components directory
│   ├── messages/        # Message-specific components
│   ├── shared/          # Reusable shared components
│   ├── views/           # View components (lists, status displays)
│   └── *.tsx            # ~60+ component files
├── contexts/            # React contexts for state management
├── layouts/             # Layout components (DefaultAppLayout, ScreenReaderAppLayout)
├── auth/                # Authentication-related components
├── utils/               # Utility components (MarkdownDisplay, CodeColorizer, etc.)
└── hooks/               # Custom hooks
```

## Component Categories

### 1. Main Components (`packages/cli/src/ui/components/`)

Dialog components, input/interaction, display components, notifications:

- **Dialogs**: `SettingsDialog.tsx`, `ThemeDialog.tsx`, `ModelDialog.tsx`, `FolderTrustDialog.tsx`, `ConsentPrompt.tsx`
- **Input/Interaction**: `InputPrompt.tsx`, `Composer.tsx`, `ShellInputPrompt.tsx`
- **Display**: `Help.tsx`, `StatsDisplay.tsx`, `Footer.tsx`, `Header.tsx`, `MainContent.tsx`
- **Notifications**: `Notifications.tsx`, `ExitWarning.tsx`, `UpdateNotification.tsx`
- **Other**: `AboutBox.tsx`, `DebugProfiler.tsx`, `DialogManager.tsx`, `LoadingIndicator.tsx`, `ThinkingAnimation.tsx`

### 2. Messages (`components/messages/`)

Message-specific UI components:

- **Basic Messages**: `ErrorMessage.tsx`, `InfoMessage.tsx`, `WarningMessage.tsx`
- **User/AI Messages**: `UserMessage.tsx`, `UserShellMessage.tsx`, `GeminiMessage.tsx`, `GeminiMessageContent.tsx`
- **Tool Messages**: `ToolMessage.tsx`, `ToolGroupMessage.tsx`, `ToolConfirmationMessage.tsx`
- **Special**: `DiffRenderer.tsx`, `CompressionMessage.tsx`, `ThinkingMessage.tsx`

### 3. Shared Components (`components/shared/`)

Reusable generic components:

- **Selection Lists**: `BaseSelectionList.tsx`, `RadioButtonSelect.tsx`, `DescriptiveRadioButtonSelect.tsx`
- **Utilities**: `EnumSelector.tsx`, `MaxSizedBox.tsx`, `ScopeSelector.tsx`
- **Text Buffer**: `text-buffer.ts`, `vim-buffer-actions.ts` (logic, not components)

### 4. Views (`components/views/`)

Complex view components:

- `McpStatus.tsx` - MCP server status display
- `ExtensionsList.tsx` - Extensions list view
- `ToolsList.tsx` - Tools list view

## How Components Are Written

### Standard Component Pattern

```typescript
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';

interface MyComponentProps {
  title: string;
  onAction: () => void;
  isActive?: boolean;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  title,
  onAction,
  isActive = false
}) => {
  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="round"
      borderColor={theme.border.default}
    >
      <Text color={theme.text.primary} bold={isActive}>
        {title}
      </Text>
    </Box>
  );
};
```

### Key Conventions

#### 1. Type-Safe Props

- **Always** define an interface for component props
- Use `React.FC<Props>` type annotation
- **Never** use `any` type - use `unknown` with type guards if truly needed
- Provide default values for optional props

**Example:**

```typescript
interface MyComponentProps {
  required: string;
  optional?: number;
  callback: (value: string) => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  required,
  optional = 10,
  callback,
}) => {
  // Component implementation
};
```

#### 2. Imports

Import patterns to follow:

```typescript
// Type-only React import
import type React from 'react';

// Ink components (the UI framework)
import { Box, Text } from 'ink';

// Theme system
import { theme } from '../semantic-colors.js';

// Hooks
import { useState, useEffect } from 'react';

// Custom hooks
import { useUIState } from '../contexts/UIStateContext.js';

// Utilities
import { someUtil } from '../utils/myUtil.js';
```

**Critical**: Always use `.js` extensions in imports, even for TypeScript files (ES module requirement).

#### 3. Naming Conventions

- **Component files**: PascalCase - `MyComponent.tsx`
- **Test files**: `MyComponent.test.tsx` (co-located with component)
- **Exports**: Named exports - `export const MyComponent`
- **Props interfaces**: `ComponentNameProps`

#### 4. Theming

Always use the semantic color system from `theme`:

**Available theme tokens:**

```typescript
theme.text.primary; // Main text color
theme.text.secondary; // Dimmed/secondary text
theme.text.accent; // Highlighted/accent text

theme.status.error; // Error messages
theme.status.warning; // Warning messages
theme.status.success; // Success messages

theme.border.default; // Border colors
theme.border.focus; // Focused border

theme.ui.selected; // Selected item background
theme.ui.cursor; // Cursor/caret color
theme.ui.highlight; // Highlighted background
```

**Usage:**

```typescript
<Text color={theme.text.accent}>Highlighted text</Text>
<Box borderColor={theme.border.default}>Bordered box</Box>
<Text color={theme.status.error}>Error message</Text>
```

The theme updates reactively via context - no manual refresh needed.

## Adding a New Component: Step-by-Step

### Step 1: Choose the Correct Location

**Decision tree:**

- General UI component (dialogs, displays, inputs) → `packages/cli/src/ui/components/`
- Message component (chat messages, tool outputs) → `packages/cli/src/ui/components/messages/`
- Reusable/generic utility component → `packages/cli/src/ui/components/shared/`
- Complex view/list component → `packages/cli/src/ui/components/views/`
- Layout component → `packages/cli/src/ui/layouts/`
- Authentication component → `packages/cli/src/ui/auth/`

### Step 2: Create the Component File

**File**: `packages/cli/src/ui/components/MyNewComponent.tsx`

```typescript
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';

interface MyNewComponentProps {
  message: string;
  onClose?: () => void;
}

export const MyNewComponent: React.FC<MyNewComponentProps> = ({
  message,
  onClose
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border.default}
      padding={1}
    >
      <Text color={theme.text.primary}>{message}</Text>
      {onClose && (
        <Box marginTop={1}>
          <Text color={theme.text.secondary}>
            Press Esc to close
          </Text>
        </Box>
      )}
    </Box>
  );
};
```

### Step 3: Create the Test File

**File**: `packages/cli/src/ui/components/MyNewComponent.test.tsx`

```typescript
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @vitest-environment jsdom */

import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MyNewComponent } from './MyNewComponent.js';

describe('MyNewComponent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders message correctly', () => {
    const { lastFrame } = render(
      <MyNewComponent message="Hello World" />
    );

    expect(lastFrame()).toContain('Hello World');
  });

  it('shows close hint when onClose is provided', () => {
    const onClose = vi.fn();
    const { lastFrame } = render(
      <MyNewComponent message="Test" onClose={onClose} />
    );

    expect(lastFrame()).toContain('Press Esc to close');
  });

  it('does not show close hint when onClose is not provided', () => {
    const { lastFrame } = render(
      <MyNewComponent message="Test" />
    );

    expect(lastFrame()).not.toContain('Press Esc to close');
  });
});
```

### Step 4: Import and Use in Parent Component

**In DialogManager, Layout, or other parent component:**

```typescript
// Add import at top
import { MyNewComponent } from './components/MyNewComponent.js';

// Use in render
export const ParentComponent = () => {
  const uiState = useUIState();

  return (
    <Box>
      {uiState.showMyNewComponent && (
        <MyNewComponent
          message="Hello from new component"
          onClose={() => {/* handle close */}}
        />
      )}
    </Box>
  );
};
```

### Step 5: Add State Management (if needed)

**If the component needs to be shown/hidden via state:**

1. **Add state to UIState** (`packages/cli/src/ui/contexts/UIStateContext.tsx`):

```typescript
export interface UIState {
  // ... existing state
  showMyNewComponent: boolean;
}
```

2. **Add actions to UIActions** (`packages/cli/src/ui/contexts/UIActionsContext.tsx`):

```typescript
export interface UIActions {
  // ... existing actions
  openMyNewComponent: () => void;
  closeMyNewComponent: () => void;
}
```

3. **Implement in state management** - update the hook/reducer that manages UIState

## How Components Hook Into the App

### Component Hierarchy

```
App.tsx (root entry point)
└── StreamingContext.Provider
    ├── ScreenReaderAppLayout (if screen reader enabled)
    └── DefaultAppLayout (standard layout)
        ├── MainContent
        │   └── HistoryItemDisplay (messages, tools, etc.)
        ├── Notifications
        ├── DialogManager (if dialogsVisible)
        │   ├── WorkspaceMigrationDialog
        │   ├── ProQuotaDialog
        │   ├── FolderTrustDialog
        │   ├── ShellConfirmationDialog
        │   ├── LoopDetectionConfirmation
        │   ├── ConsentPrompt
        │   ├── ThemeDialog
        │   ├── SettingsDialog
        │   ├── ModelDialog
        │   ├── AuthInProgress
        │   └── AuthDialog
        ├── Composer (input area, if no dialogs)
        └── ExitWarning
```

### Integration Points

#### 1. Via DialogManager

**File**: `packages/cli/src/ui/components/DialogManager.tsx`

The DialogManager component conditionally renders various dialogs based on UIState flags. This is the **primary integration point for dialog components**.

**Example addition:**

```typescript
export const DialogManager = ({ terminalWidth }: DialogManagerProps) => {
  const uiState = useUIState();
  const uiActions = useUIActions();

  // Add your dialog check
  if (uiState.showMyNewDialog) {
    return <MyNewDialog onClose={uiActions.closeMyNewDialog} />;
  }

  // ... other dialog checks

  return null;
};
```

**Existing dialogs managed here:**

- `showWorkspaceMigrationDialog` → `WorkspaceMigrationDialog`
- `proQuotaRequest` → `ProQuotaDialog`
- `isFolderTrustDialogOpen` → `FolderTrustDialog`
- `shellConfirmationRequest` → `ShellConfirmationDialog`
- `loopDetectionConfirmationRequest` → `LoopDetectionConfirmation`
- `confirmationRequest` → `ConsentPrompt`
- `isThemeDialogOpen` → `ThemeDialog`
- `isSettingsDialogOpen` → `SettingsDialog`
- `isModelDialogOpen` → `ModelDialog`
- `isAuthenticating` → `AuthInProgress`
- `isAuthDialogOpen` → `AuthDialog`

#### 2. Via Layout Components

**DefaultAppLayout** (`packages/cli/src/ui/layouts/DefaultAppLayout.tsx`):

```typescript
export const DefaultAppLayout: React.FC<{ width?: string }> = ({ width = '90%' }) => {
  const uiState = useUIState();

  return (
    <Box flexDirection="column" width={width}>
      <MainContent />

      <Box flexDirection="column" ref={uiState.mainControlsRef}>
        <Notifications />

        {uiState.dialogsVisible ? (
          <DialogManager terminalWidth={uiState.terminalWidth} />
        ) : (
          <Composer />
        )}

        <ExitWarning />
      </Box>
    </Box>
  );
};
```

**To add component to layout:**

- Import component
- Add to appropriate section (before/after Notifications, Composer, etc.)
- Conditionally render based on state if needed

#### 3. Direct in App.tsx

**File**: `packages/cli/src/ui/App.tsx`

Some components render directly at the root level:

```typescript
export const App = () => {
  const uiState = useUIState();

  // Special case: quitting state
  if (uiState.quittingMessages) {
    return <QuittingDisplay />;
  }

  // Normal app rendering
  return (
    <StreamingContext.Provider value={uiState.streamingState}>
      {isScreenReaderEnabled ? (
        <ScreenReaderAppLayout />
      ) : (
        <DefaultAppLayout width={containerWidth} />
      )}
    </StreamingContext.Provider>
  );
};
```

#### 4. Within MainContent

**File**: `packages/cli/src/ui/components/MainContent.tsx`

MainContent displays the conversation history and handles message rendering. Add components here for persistent display elements.

## State Management via Contexts

Components access application state and actions through React contexts.

### Available Contexts

#### UIStateContext

**Primary UI state** - flags, data, refs for UI components

```typescript
import { useUIState } from '../contexts/UIStateContext.js';

const MyComponent = () => {
  const uiState = useUIState();

  // Access state properties
  const {
    history,
    isThemeDialogOpen,
    terminalWidth,
    showAutoAcceptIndicator,
    // ... many more
  } = uiState;
};
```

**Key state properties:**

- `history: HistoryItem[]` - Conversation history
- `isThemeDialogOpen`, `isSettingsDialogOpen`, `isModelDialogOpen` - Dialog visibility flags
- `terminalWidth`, `terminalHeight` - Terminal dimensions
- `showAutoAcceptIndicator` - Auto-accept mode
- `shellModeActive` - Shell mode flag
- `streamingState` - Current streaming state
- `currentModel` - Active AI model

Full interface at `packages/cli/src/ui/contexts/UIStateContext.tsx`

#### UIActionsContext

**UI action handlers** - functions to trigger state changes

```typescript
import { useUIActions } from '../contexts/UIActionsContext.js';

const MyComponent = () => {
  const uiActions = useUIActions();

  // Call action handlers
  uiActions.openThemeDialog();
  uiActions.closeSettingsDialog();
  uiActions.handleThemeSelect(themeName);
};
```

**Common actions:**

- `openThemeDialog()`, `closeThemeDialog()`
- `openSettingsDialog()`, `closeSettingsDialog()`
- `handleThemeSelect(theme: string)`
- `setAuthState(state: AuthState)`
- `onAuthError(error: string)`

#### SettingsContext

**User settings** - access to configuration

```typescript
import { useSettings } from '../contexts/SettingsContext.js';

const MyComponent = () => {
  const settings = useSettings();

  // Access settings
  const autoAccept = settings.settings.autoAcceptEdits;
  const theme = settings.settings.theme;
};
```

#### ThemeContext

**Theme management** - current theme and theme switching

```typescript
import { useTheme } from '../contexts/ThemeContext.js';

const MyComponent = () => {
  const { currentTheme, setTheme } = useTheme();

  // Use theme
  console.log(currentTheme.name);
  setTheme('dark');
};
```

#### SessionContext

**Session statistics** - session-level metrics

```typescript
import { useSessionStats } from '../contexts/SessionContext.js';

const MyComponent = () => {
  const stats = useSessionStats();

  // Access stats
  const { inputTokens, outputTokens, turnCount } = stats;
};
```

#### ConfigContext

**Configuration** - app configuration

```typescript
import { useConfig } from '../contexts/ConfigContext.js';

const MyComponent = () => {
  const config = useConfig();

  // Access config
  const apiKey = config.apiKey;
};
```

#### VimModeContext

**Vim mode state** - vim mode enabled/disabled

```typescript
import { useVimMode } from '../contexts/VimModeContext.js';

const MyComponent = () => {
  const { vimEnabled, toggleVimEnabled } = useVimMode();

  // Use vim state
  if (vimEnabled) {
    // Show vim indicator
  }
};
```

#### StreamingContext

**Streaming state** - AI response streaming

```typescript
import { useContext } from 'react';
import { StreamingContext } from '../contexts/StreamingContext.js';

const MyComponent = () => {
  const streamingState = useContext(StreamingContext);

  // Check streaming state
  if (streamingState.isStreaming) {
    // Show loading indicator
  }
};
```

## Testing Patterns

### Test Structure

```typescript
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @vitest-environment jsdom */

import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MyComponent } from './MyComponent.js';

describe('MyComponent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    const { lastFrame } = render(<MyComponent prop="value" />);
    expect(lastFrame()).toContain('expected text');
  });

  it('handles user interaction', () => {
    const onAction = vi.fn();
    const { lastFrame } = render(<MyComponent onAction={onAction} />);

    // Simulate interaction (if needed via hooks)
    // Then assert
    expect(onAction).toHaveBeenCalled();
  });
});
```

### Testing Tools

**ink-testing-library:**

- `render(component)` - Render component for testing
- `lastFrame()` - Get the current rendered output as string
- Use string assertions on output

**Vitest:**

- `describe()` - Test suite
- `it()` / `test()` - Individual test
- `expect()` - Assertions
- `vi.fn()` - Create mock function
- `vi.mock()` - Mock modules
- `beforeEach()`, `afterEach()` - Setup/teardown

### Mocking Contexts

When testing components that use contexts:

```typescript
import { vi } from 'vitest';

// Mock the context hook
vi.mock('../contexts/UIStateContext.js', () => ({
  useUIState: () => ({
    isThemeDialogOpen: true,
    terminalWidth: 80,
    // ... mock state
  }),
}));

// Or use wrapper pattern
const wrapper = ({ children }) => (
  <UIStateContext.Provider value={mockState}>
    {children}
  </UIStateContext.Provider>
);

const { lastFrame } = render(<MyComponent />, { wrapper });
```

### Testing Examples from Codebase

**Simple rendering test** (`Help.test.tsx`):

```typescript
it('should not render hidden commands', () => {
  const { lastFrame } = render(<Help commands={mockCommands} />);
  const output = lastFrame();

  expect(output).toContain('/test');
  expect(output).not.toContain('/hidden');
});
```

## Common Patterns

### 1. Conditional Rendering

```typescript
// Simple conditional
{isVisible && <MyComponent />}

// Ternary
{isActive ? <ActiveComponent /> : <InactiveComponent />}

// Multiple conditions
{condition1 && condition2 && <Component />}

// Null safety
{data && <Component data={data} />}
```

### 2. List Rendering

```typescript
// Map over array
{items.map((item) => (
  <Box key={item.id}>
    <Text>{item.name}</Text>
  </Box>
))}

// Filter and map
{items
  .filter(item => !item.hidden)
  .map((item) => (
    <Box key={item.id}>
      <Text>{item.label}</Text>
    </Box>
  ))}
```

### 3. Layout with Ink

**Vertical layout:**

```typescript
<Box flexDirection="column">
  <Text>Line 1</Text>
  <Text>Line 2</Text>
</Box>
```

**Horizontal layout:**

```typescript
<Box flexDirection="row">
  <Text>Left</Text>
  <Text>Right</Text>
</Box>
```

**Spacing:**

```typescript
<Box padding={1} margin={2} marginTop={1} marginBottom={1}>
  <Text>Padded and margined</Text>
</Box>

{/* Or explicit spacing */}
<Box height={1} /> {/* Vertical spacer */}
```

**Borders:**

```typescript
<Box
  borderStyle="round"        // 'round' | 'single' | 'double' | 'classic'
  borderColor={theme.border.default}
  padding={1}
>
  <Text>Bordered content</Text>
</Box>
```

**Flex layout:**

```typescript
<Box flexDirection="row">
  <Box flexGrow={1}>
    <Text>Grows to fill space</Text>
  </Box>
  <Box width={20}>
    <Text>Fixed width</Text>
  </Box>
</Box>
```

### 4. Theme Usage

```typescript
// Text colors
<Text color={theme.text.primary}>Primary text</Text>
<Text color={theme.text.secondary}>Secondary text</Text>
<Text color={theme.text.accent}>Accent text</Text>

// Status colors
<Text color={theme.status.error}>Error message</Text>
<Text color={theme.status.warning}>Warning</Text>
<Text color={theme.status.success}>Success</Text>

// Borders
<Box borderColor={theme.border.default}>Content</Box>
<Box borderColor={theme.border.focus}>Focused</Box>

// UI elements
<Box backgroundColor={theme.ui.selected}>Selected item</Box>
```

### 5. Text Formatting

```typescript
// Basic formatting
<Text bold>Bold text</Text>
<Text italic>Italic text</Text>
<Text underline>Underlined text</Text>
<Text dimColor>Dimmed text</Text>

// Wrapping
<Text wrap="wrap">Long text that wraps...</Text>
<Text wrap="truncate">Long text that gets cut...</Text>
<Text wrap="truncate-end">...cut at end</Text>

// Combining styles
<Text bold color={theme.text.accent}>
  Bold and colored
</Text>
```

### 6. User Input Handling

For interactive components, use hooks:

```typescript
import { useInput } from 'ink';

const MyComponent = () => {
  useInput((input, key) => {
    if (key.return) {
      // Handle Enter key
    }
    if (key.escape) {
      // Handle Esc key
    }
    if (input === 'q') {
      // Handle 'q' key
    }
  });

  return <Box>Interactive component</Box>;
};
```

**Use custom hooks for complex input:**

- `useKeypress()` - Custom keypress handling
- `useInput()` - Ink's built-in input hook

### 7. State Management in Components

```typescript
import { useState, useEffect } from 'react';

const MyComponent = () => {
  const [count, setCount] = useState(0);
  const [data, setData] = useState<string[]>([]);

  useEffect(() => {
    // Side effect (be careful with useEffect in Ink)
    const timer = setTimeout(() => {
      setCount(c => c + 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return <Text>Count: {count}</Text>;
};
```

**Important**: Minimize `useEffect` usage. Prefer event handlers and direct state updates.

## Important Rules

### ✅ DO:

1. **Use functional components** with hooks - no class components
2. **Define proper TypeScript interfaces** for all props
3. **Use semantic theme colors** via `theme` object
4. **Co-locate test files** - `Component.test.tsx` next to `Component.tsx`
5. **Use `.js` extensions** in all imports (ES module requirement)
6. **Export as named exports** - `export const Component`
7. **Write tests** for every new component
8. **Use OpenTelemetry logging** from `@alfred/alfred-cli-core` (not console.log)
9. **Format code** with `npm run format` before committing
10. **Follow React best practices**: pure render functions, immutable updates, one-way data flow

### ❌ DON'T:

1. **Never use `any` type** - use `unknown` with type guards instead
2. **Never use `console.log`** - use OpenTelemetry logging
3. **Never create class components** - functional only
4. **Never mutate state directly** - use immutable updates
5. **Never skip test files** for new components
6. **Never use emojis** in code/UI unless explicitly requested
7. **Never call `setState` inside `useEffect`** without good reason (performance)
8. **Don't overuse `useEffect`** - prefer event handlers
9. **Don't use barrel exports** (index.ts files) - import directly
10. **Never commit without running verification** (see below)

## Verification Workflow

**Before considering component work complete:**

```bash
# 1. Format code
npm run format

# 2. Lint with zero warnings
npm run lint:ci

# 3. Type check
npm run typecheck

# 4. Build all packages
npm run build

# 5. Bundle CLI
npm run bundle

# 6. Run all tests
npm run test:ci
```

**Or use the comprehensive preflight check:**

```bash
npm run preflight
```

This runs: `clean → install → format → lint:ci → build → typecheck → test:ci`

**After any code changes:**

- Restart the entire verification cycle
- Never declare done without all checks passing
- Never push without explicit user permission

## File Location Reference

**Component files:**

- Main components: `packages/cli/src/ui/components/[ComponentName].tsx`
- Messages: `packages/cli/src/ui/components/messages/[ComponentName].tsx`
- Shared: `packages/cli/src/ui/components/shared/[ComponentName].tsx`
- Views: `packages/cli/src/ui/components/views/[ComponentName].tsx`

**Test files:**

- Co-located: `packages/cli/src/ui/components/[ComponentName].test.tsx`

**Integration points:**

- Dialog manager: `packages/cli/src/ui/components/DialogManager.tsx`
- Default layout: `packages/cli/src/ui/layouts/DefaultAppLayout.tsx`
- App root: `packages/cli/src/ui/App.tsx`
- Main content: `packages/cli/src/ui/components/MainContent.tsx`

**State management:**

- UI state: `packages/cli/src/ui/contexts/UIStateContext.tsx`
- UI actions: `packages/cli/src/ui/contexts/UIActionsContext.tsx`
- Settings: `packages/cli/src/ui/contexts/SettingsContext.tsx`
- Theme: `packages/cli/src/ui/contexts/ThemeContext.tsx`

**Theme system:**

- Semantic colors: `packages/cli/src/ui/semantic-colors.ts`
- Theme manager: `packages/cli/src/ui/themes/theme-manager.ts`

**TypeScript config:**

- `packages/cli/tsconfig.json` - TSConfig with React JSX settings

## Additional Resources

- **Ink documentation**: https://github.com/vadimdemedes/ink
- **React documentation**: https://react.dev
- **Vitest documentation**: https://vitest.dev
- **Project CLAUDE.md**: `/CLAUDE.md` and `.claude/CLAUDE.md` for project-wide guidelines

## Quick Reference Checklist

When creating a new component:

- [ ] Choose correct directory location
- [ ] Create component file with proper license header
- [ ] Define TypeScript interface for props
- [ ] Use `React.FC<Props>` type annotation
- [ ] Import theme from `semantic-colors.js`
- [ ] Use `.js` extensions in all imports
- [ ] Follow Ink layout patterns (Box, Text)
- [ ] Create co-located test file
- [ ] Write at least 2-3 tests (render, props, interaction)
- [ ] Import and use in parent component
- [ ] Add to DialogManager if it's a dialog
- [ ] Add state/actions to contexts if needed
- [ ] Run `npm run format`
- [ ] Run `npm run lint:ci` (zero warnings)
- [ ] Run `npm run typecheck`
- [ ] Run `npm run build`
- [ ] Run `npm run test:ci`
- [ ] Verify component renders correctly in terminal
