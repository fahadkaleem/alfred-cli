# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alfred is a context management and orchestration layer designed to enhance Claude Code's effectiveness on complex software projects. Rather than competing with AI coding assistants, Alfred acts as a persistent planning and context delivery system that solves the critical problem of context fragmentation across development sessions.

**Core Purpose**: Alfred maintains institutional knowledge, manages task dependencies, and delivers precisely scoped context to Claude Code for each coding task. This separation of concerns mirrors successful team structures - Alfred handles project orchestration (like a technical lead), while Claude Code focuses on implementation (like an engineer executing well-defined tasks).

**Technical Foundation**: TypeScript monorepo using npm workspaces, React with Ink for terminal UI. The codebase currently integrates with the Gemini API, but the architectural vision positions Alfred as a planning layer that can orchestrate any AI coding assistant, with Claude Code as the primary execution engine.

**Key Capabilities**:

- Integration with project management systems (Jira, Linear) for task synchronization
- Decomposition of requirements into AI-ready, properly scoped tasks
- Persistent decision tracking and architectural context propagation
- Dependency identification and task sequencing
- Context optimization to maximize AI assistant efficiency

## Alfred's Relationship to Claude Code

**Alfred is NOT a competitor to Claude Code** - it is a force multiplier designed specifically to enhance Claude Code's effectiveness on complex projects.

**Division of Responsibilities**:

| Alfred (Planning Layer)                 | Claude Code (Execution Layer)       |
| --------------------------------------- | ----------------------------------- |
| Project orchestration and task planning | Code implementation and refactoring |
| Context management across sessions      | File operations and editing         |
| Architectural decision tracking         | Testing and verification            |
| Integration with project management     | Git operations and commits          |
| Requirement decomposition               | Debugging and problem-solving       |
| Dependency identification               | Build and deployment execution      |

**The Problem Alfred Solves**: Claude Code sessions start with zero knowledge of previous work. Developers must repeatedly explain project context, architecture, and prior decisions, consuming significant portions of the context window before any code generation begins. This creates inefficiency and inconsistency across tasks.

**Alfred's Solution**: Maintain persistent project knowledge and deliver precisely scoped, contextually rich task briefs to Claude Code. When a developer invokes Claude Code for a task, Alfred ensures it receives all necessary context - relevant files, architectural constraints, prior decisions, and acceptance criteria - eliminating redundant exploration and enabling immediate, informed implementation.

**Complementary Architecture**: Alfred analyzes requirements using LLM capabilities to understand and decompose work, then orchestrates Claude Code sessions with targeted context. Alfred handles the "what" and "why" while Claude Code handles the "how".

## Code Quality Rules

### TypeScript

- **NEVER use `any`** - Always specify proper types. Use `unknown` if the type is truly unknown and add proper type guards
- **Type assertions** - Use sparingly, they bypass type checking. If you need one, it's often a code smell
- **Exhaustive switches** - Use `checkExhaustive()` helper in default cases (from `packages/cli/src/utils/checks.ts`)

### Logging

- **Use OpenTelemetry logging system** - Never use `console.log`, `console.error`, or `console.debug`
- The logging system is in `packages/core/src/telemetry/loggers.ts`
- Log structured events with proper attributes for telemetry

### Linting and Formatting

- **ALWAYS run from the main `alfred-cli` directory** - Never run from subdirectories like `packages/cli`
- **Always run `npm run format` before committing** - Never push without formatting
- **Always run `npm run lint` before considering work complete**
- **Fix ALL linting errors**, including warnings about `any` types
- **Run `npm run typecheck` to ensure type safety**

## Communication Style

- **BANNED PHRASES**: "You're absolutely right", "You're right", "Absolutely", "Indeed", "Correct"
  - Instead: Just say "Ok" or skip acknowledgment entirely and do the task
- **Never apologize** - No "Sorry", "My apologies", "I apologize"
- **Skip all agreement/validation theater** - Just DO THE THING
- **Be direct and focus on the task** - Get straight to work

## Common Commands

### Build and Development

```bash
# Full preflight check (build, test, lint, typecheck) - run before submitting changes
npm run preflight

# Build all packages
npm run build

# Build specific package
npm run build --workspace=packages/cli

# Bundle the CLI (creates bundle/alfred.js)
npm run bundle

# Start the CLI
npm run start

# Debug mode
npm run debug
```

### Testing

```bash
# Run all tests
npm test

# Run tests in CI mode
npm run test:ci

# Run integration tests
npm run test:integration:all

# Run end-to-end tests (verbose with output kept)
npm run test:e2e

# Run a single test file
npx vitest run packages/core/src/tools/shell.test.ts
```

### Linting and Formatting

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Lint for CI (fails on warnings)
npm run lint:ci

# Format code with Prettier
npm run format

# Type check all packages
npm run typecheck
```

### Other

```bash
# Clean build artifacts
npm run clean

# Generate git commit info
npm run generate
```

## Code Verification and Deployment Rules

### Never Declare Done Without Full Verification

- **NEVER** declare something done unless it has compiled, tested, and linted
- **NEVER** run `git add` or `git commit` without explicit user permission
- **Verification workflow**: `npm run format` → `npm run lint:ci` → `npm run typecheck` → `npm run build` → `npm run bundle` → `npm run test:ci`
- **ONLY when user requests a commit**: THEN run `git add -A` to stage changes before committing
- **CRITICAL**: ALWAYS run build commands from the main project directory (`alfred-cli`), NOT from subdirectories like `packages/cli`
- **ANY** code changes require restarting the entire verification cycle
- If you compile, test, or lint and get an error, then change code, you MUST compile, test, lint again
- You may commit locally before risky changes, but NEVER push until the whole cycle passes
- **NEVER** push without explicit user permission - they need to test the UI first
- **Documentation-only changes** (`*.md` files, `docs/`) do NOT require build/test/lint cycle

### CI-Aligned Verification (MUST DO BEFORE PUSH)

Run these checks in this exact order to match GitHub Actions CI:

1. `npx prettier --check .` - Ensure all files are formatted
2. `npm run lint:ci` - Zero warnings allowed (eslint with --max-warnings 0)
3. `npm run typecheck` - Type safety check across all packages
4. `npm run build` - Build all packages
5. `npm run bundle` - Create the bundled CLI executable
6. `npm run test:ci` - Run all tests with CI configuration

Or use the comprehensive preflight check:

```bash
npm run preflight
```

This runs: clean → install → format → lint:ci → build → typecheck → test:ci

## Git Commit Signing Policy

### Never Co-sign Commits

NEVER include the Claude commit signature/co-authorship.

**Do NOT add:**

```
🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Git Hooks and Code Quality

**IMPORTANT**: A Git pre-commit hook is installed via Husky that enforces code quality. It will:

- Run linting via `lint-staged` and block commit if it fails
- Run formatting via Prettier and block commit if files need changes
- Ensure only quality code gets committed

If the pre-commit hook fails, you MUST:

1. Fix any lint/type errors reported
2. Run `npm run format` to fix formatting
3. **ONLY if user explicitly requested a commit**: Run `git add -A` to stage the changes, then try to commit again

**NEVER run `git add` without explicit user permission** - Staging changes is a git operation that should only happen when the user wants to commit.

**NEVER USE `git commit --no-verify` or environment tricks to skip hooks** - This is for human emergencies only, not for bypassing quality checks. If the hooks are failing, FIX THE CODE, don't skip the checks.

## Architecture

### Monorepo Structure

The project uses npm workspaces with three packages:

- **`packages/core`**: Core orchestration logic and AI integration layer
  - Project context management and task decomposition
  - Integration with project management systems (planned: Jira, Linear)
  - Git repository analysis and state synchronization
  - Architectural decision tracking and propagation
  - File system operations, shell execution, git utilities
  - MCP (Model Context Protocol) server integration
  - LLM client abstraction (currently Gemini API via `@google/genai`)
  - Authentication (OAuth, API keys, Vertex AI)
  - Configuration and settings management

- **`packages/cli`**: User-facing CLI interface using React + Ink
  - Terminal UI components and rendering
  - Command parsing and argument handling
  - Interactive planning and task management workflows
  - Theme system and visual customization
  - Context providers for state management

- **`packages/test-utils`**: Shared testing utilities for both packages

### Key Architectural Patterns

**Orchestration Engine** (Current + Planned): `packages/core/src/core/` will evolve from a conversation loop to a planning and orchestration system:

- `alfredChat.ts`: Main orchestration engine - currently handles chat, will manage task planning and context delivery
- `client.ts`: LLM client abstraction - enables integration with multiple AI assistants
- `contentGenerator.ts`: Streaming content generation - used for planning and analysis
- `turn.ts`: Conversation turn representation - foundation for task decomposition tracking
- `coreToolScheduler.ts`: Tool execution scheduler - manages both internal operations and Claude Code invocation

**Tools System**: `packages/core/src/tools/` implements a plugin-like tool architecture:

- Each tool (read-file, write-file, shell, grep, etc.) is a separate module
- `tool-registry.ts`: Registers and manages available tools
- Tools follow a standard interface for execution and error handling
- MCP servers extend tool capabilities dynamically
- Tools enable Alfred to analyze codebases, interact with git, and gather context for task scoping

**UI Layer**: `packages/cli/src/ui/` uses React with Ink for terminal rendering:

- Components are functional React components with hooks
- Context providers manage global state (theme, settings, vim mode, session stats)
- Custom hooks encapsulate complex logic (keyboard protocols, websockets)

**Configuration**: Multi-layer configuration system:

- CLI arguments parsed with yargs
- Settings from `~/.alfred/settings.json`
- Project-specific `.alfred/` directory for local configuration
- Memory files (ALFRED.md) for persistent context

### Build System

- **TypeScript**: Strict mode enabled with comprehensive type checking
- **esbuild**: Bundles the CLI into `bundle/alfred.js` (ESM format)
- **Workspace builds**: Each package builds independently, core consumed by cli
- Entry point: `packages/cli/index.ts` → compiled → bundled → `bundle/alfred.js`

### Dependencies of Note

- `@google/genai`: Official Google Gemini API SDK
- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `ink`: React renderer for interactive CLI interfaces
- `simple-git`: Git operations and repository inspection
- `@xterm/headless`: Terminal emulation for shell execution
- `google-auth-library`: OAuth2 and authentication flows

## Testing Guidelines

This project uses **Vitest** as the testing framework.

### Test Structure

- **Location**: Test files are co-located with source files (`*.test.ts` for logic, `*.test.tsx` for React)
- **Framework**: Use Vitest (`describe`, `it`, `expect`, `vi`)
- **Setup**: Use `beforeEach` for `vi.resetAllMocks()` and `afterEach` for `vi.restoreAllMocks()`

### Mocking Patterns

**ES Modules**: Mock at the top of the file before imports:

```typescript
vi.mock('module-name', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, specificFunction: vi.fn() };
});
```

**Hoisted Mocks**: For cross-cutting dependencies:

```typescript
const mockFn = vi.hoisted(() => vi.fn());
vi.mock('module', () => ({ method: mockFn }));
```

**React Components (Ink)**:

- Use `render()` from `ink-testing-library`
- Assert with `lastFrame()`
- Mock child components and custom hooks

### Common Mock Targets

- Node.js built-ins: `fs`, `fs/promises`, `os`, `child_process`
- External SDKs: `@google/genai`, `@modelcontextprotocol/sdk`
- Internal modules: Often mock core package imports in cli tests

## Code Style Requirements

### TypeScript Patterns

- **Prefer plain objects over classes**: Use interfaces/types instead of classes
- **ES modules for encapsulation**: Export defines public API, unexported is private
- **Type safety**: Never use `any`, use `unknown` with type guards (see Code Quality Rules above)

### React Guidelines

- **Functional components only**: Use hooks, never class components
- **Pure render functions**: No side effects during render
- **Avoid `useEffect` when possible**: Prefer event handlers over effects
- **Don't call `setState` inside `useEffect`**: Degrades performance
- **Follow Rules of Hooks**: Unconditional calls at top level only
- **Minimize `useRef`**: Only for DOM operations or non-React integrations
- **React Compiler optimization**: No manual `useMemo`/`useCallback`/`React.memo` needed

### JavaScript Best Practices

- **Array operators**: Use `.map()`, `.filter()`, `.reduce()` for immutability
- **Immutable updates**: Never mutate state directly, use spread syntax
- **One-way data flow**: Props down, lift state up for sharing

### General Style

- **Flag naming**: Use hyphens not underscores (`--my-flag` not `--my_flag`)
- **Comments**: Only write high-value comments, avoid obvious explanations
- **File imports**: Use `.js` extensions in imports even for `.ts` files (ES module requirement)

## Git Workflow

- **Main branch**: `main`
- **Pre-commit hooks**: Husky runs linting and formatting via lint-staged (see Git Hooks section above)
- **Before pushing**: Run full CI-aligned verification (see Code Verification section above)
- **NEVER push without explicit user permission** - User needs to test UI first
- **NO co-authorship signatures** - See Git Commit Signing Policy above

## Special Considerations

### Authentication and Integration

**Current LLM Authentication** (transitional):

1. **Login with Google (OAuth)**: Default, uses browser flow
2. **API Key**: Set `GEMINI_API_KEY` environment variable
3. **Vertex AI**: Set `GOOGLE_API_KEY` and `GOOGLE_GENAI_USE_VERTEXAI=true`

**Future Integration Points** (planned):

- Project management system APIs (Jira, Linear) for task synchronization
- Claude Code CLI integration for execution orchestration
- Git hosting APIs (GitHub, GitLab) for repository analysis and automation

### MCP Server Integration

- MCP servers are configured in `~/.alfred/settings.json`
- They dynamically extend available tools
- See `packages/core/src/mcp/` for implementation

### Theme System

- Themes defined in `packages/cli/src/ui/themes/`
- Reactive theme context updates UI in real-time
- Can be customized per user via settings

### Telemetry

- Google Cloud telemetry exporters have been removed
- OpenTelemetry infrastructure remains for custom instrumentation
- See recent commits removing Clearcut and GCP-specific telemetry

### IDE/Sandbox Features Removed

Recent refactoring removed IDE integration and sandbox functionality:

- No VS Code companion extension
- No Docker sandbox execution
- Simplified deployment model

---

## Important Instruction Reminders

**Code Quality**

- NEVER use `any` - use `unknown` with type guards
- Use OpenTelemetry logging, not `console.log`
- Always run commands from main `alfred-cli` directory

**Communication**

- NO banned phrases: "You're right", "Absolutely", "Indeed", "Sorry"
- Skip validation theater - just do the task
- Be direct and focus on work

**Verification Cycle**

- NEVER declare done without: format → add → lint → typecheck → build → bundle → test
- ANY code change = restart full cycle
- NEVER push without explicit user permission
- Documentation-only changes skip build/test/lint

**Git Workflow**

- Respect pre-commit hooks - NEVER skip with `--no-verify`
- NO Claude co-authorship signatures in commits
- Fix the code if hooks fail, don't bypass them
