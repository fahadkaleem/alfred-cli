<!--
Sync Impact Report:
Version: 1.0.0 (initial constitution)
Ratification Date: 2025-10-03
Last Amended: 2025-10-03

Principles Defined:
- I. Type Safety First
- II. Test-Driven Development (TDD)
- III. OpenTelemetry Observability
- IV. Monorepo Modularity
- V. Terminal-First Design
- VI. Extensibility via Standards

Templates Requiring Updates:
✅ plan-template.md - Constitution Check section references this document
✅ spec-template.md - Review checklist aligns with testability principle
✅ tasks-template.md - TDD workflow enforced in Phase 3.2
✅ agent-file-template.md - No updates needed (auto-generated)

Follow-up TODOs: None
-->

# Alfred CLI Constitution

## Core Principles

### I. Type Safety First

TypeScript strict mode is mandatory. Never use `any` - use `unknown` with proper type guards when types are truly unknown. Type assertions must be justified as they bypass type checking. All switches must be exhaustive using the `checkExhaustive()` helper. Type safety prevents runtime errors and improves maintainability.

**Rationale**: Type errors caught at compile time are orders of magnitude cheaper to fix than runtime bugs in production.

### II. Test-Driven Development (TDD)

TDD is non-negotiable. Tests must be written and must fail before implementation begins. Follow strict Red-Green-Refactor cycle: write failing test → implement to pass → refactor. Contract tests validate API boundaries, integration tests validate user flows, unit tests validate logic.

**Rationale**: Tests written after implementation unconsciously validate the implementation rather than the requirements, leading to false confidence.

### III. OpenTelemetry Observability

Use the OpenTelemetry logging system exclusively (packages/core/src/telemetry/loggers.ts). Never use `console.log`, `console.error`, or `console.debug`. Log structured events with proper attributes for telemetry. All errors must be logged with context.

**Rationale**: Structured logging enables production debugging, performance analysis, and user behavior insights impossible with console logging.

### IV. Monorepo Modularity

Maintain clear separation between packages: `core` for orchestration logic, `cli` for terminal UI, `test-utils` for shared testing. Each package builds independently. Core package is consumed by CLI but has no UI dependencies. Cross-package imports must be explicit and justified.

**Rationale**: Separation of concerns enables parallel development, independent testing, and potential reuse of core logic in other interfaces.

### V. Terminal-First Design

Alfred is a CLI tool optimized for developers who live in the terminal. All features must work via command-line interface. React with Ink provides the UI layer. Text input/output is the primary protocol. JSON output format supports scripting and automation.

**Rationale**: Terminal interfaces are faster, scriptable, and accessible in all development environments including remote servers and CI/CD.

### VI. Extensibility via Standards

Support Model Context Protocol (MCP) for custom tool integration. MCP servers extend capabilities dynamically without core modifications. Tools follow standard interfaces for execution and error handling. Plugin architecture enables community contributions.

**Rationale**: Standards-based extensibility allows users to customize Alfred for their workflows without forking or waiting for upstream changes.

## Development Workflow

### Code Quality Gates

All code changes must pass the preflight check before commit:

1. `npm run format` - Prettier formatting (auto-fixes)
2. `npm run lint:ci` - ESLint with zero warnings tolerance
3. `npm run typecheck` - TypeScript type validation across all packages
4. `npm run build` - Build all packages successfully
5. `npm run bundle` - Create bundled CLI executable
6. `npm run test:ci` - All tests pass with CI configuration

Use `npm run preflight` to run the complete sequence.

### Build Requirements

- Always run build commands from main `alfred-cli` directory, never from subdirectories
- After formatting, always stage changes with `git add -A` before committing
- Never skip Git hooks with `--no-verify` - fix the code if hooks fail
- Documentation-only changes (\*.md files, docs/) skip build/test/lint cycle

### Testing Requirements

Tests are co-located with source files (_.test.ts for logic, _.test.tsx for React). Use Vitest framework. Mock ES modules at file top before imports. Integration tests use real file system operations. E2E tests validate full user workflows.

## Communication and Collaboration

### Direct Communication

Avoid validation theater phrases: "You're absolutely right", "Indeed", "Correct". Skip acknowledgment and execute the task. Never apologize unnecessarily. Be direct and focus on outcomes.

**Rationale**: Developer tools should optimize for speed and clarity, not social niceties that waste time.

### Git Workflow

Main branch is `main`. Pre-commit hooks enforce linting and formatting via Husky. Never push without explicit user permission - UI testing required first. Never include Claude co-authorship signatures in commits. Fix code to pass hooks rather than bypassing them.

## Architecture Constraints

### Prohibited Practices

- Using `any` type in TypeScript (use `unknown` with type guards)
- Using `console.*` methods for logging (use OpenTelemetry)
- Mutating state directly (use immutable patterns)
- Running build commands from package subdirectories
- Committing code that fails preflight checks
- Skipping Git hooks (--no-verify)

### Required Patterns

- Functional React components with hooks (no classes)
- ES modules for encapsulation (export defines public API)
- Immutable array operations (.map, .filter, .reduce)
- One-way data flow (props down, lift state up)
- Flag naming with hyphens (--my-flag not --my_flag)

## Governance

### Amendment Process

Constitution changes require:

1. Documentation of rationale and impact analysis
2. Version bump (MAJOR for breaking changes, MINOR for additions, PATCH for clarifications)
3. Update to all dependent templates (plan, spec, tasks, commands)
4. Sync Impact Report documenting all changes

### Versioning Policy

Constitution follows semantic versioning:

- **MAJOR**: Backward incompatible governance/principle removals or redefinitions
- **MINOR**: New principle/section added or materially expanded guidance
- **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements

### Compliance Verification

All plans must include Constitution Check section validating compliance. Violations must be explicitly documented in Complexity Tracking with justification. Simpler alternatives must be considered before approval.

Use CLAUDE.md for runtime development guidance and agent-specific instructions.

**Version**: 1.0.0 | **Ratified**: 2025-10-03 | **Last Amended**: 2025-10-03
