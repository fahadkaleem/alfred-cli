# Template Improvements Analysis

## What We Improved in create-tools.md

### Missing Patterns Added:

1. **toolLocations() method** - Returns affected file paths for UI display
2. **shouldConfirmExecute() method** - Critical for user confirmation on mutating tools
3. **Confirmation types** - Edit, Exec, MCP with exact interfaces
4. **Confirmation outcomes** - ProceedOnce, ProceedAlways, etc.
5. **CoreToolScheduler lifecycle** - Tool call state machine
6. **Allowlisting pattern** - Per-command/per-tool auto-approval
7. **Abort signal handling** - Proper cancellation support

## Template Improvements Needed

### 1. **Add "Critical Methods" Section to Research Guidelines**

**Current**: Template tells agents to study existing patterns but doesn't guide them on WHAT to look for.

**Improvement**: Add explicit checklist to Phase 2: Deep Dive

```markdown
### Phase 2: Deep Dive

1. **Read critical files completely**
   - Don't skim - read full implementations
   - Understand the "why" behind patterns
   - Note edge cases and error handling
   - Identify testing approaches

2. **Identify ALL required methods and interfaces**
   - List all methods that MUST be implemented (not just common ones)
   - Find optional methods (override patterns)
   - Document method signatures with exact types
   - Note which methods are abstract vs optional overrides

3. **Trace integration points**
   - How do pieces hook together?
   - What contexts/state management is used?
   - What are the entry points?
   - Where are components registered/initialized?
   - **What lifecycle hooks exist?** (critical!)
```

### 2. **Add "Base Class Investigation" Step**

**Current**: Template doesn't explicitly tell agents to investigate base classes/abstract classes.

**Improvement**: Add to Research Guidelines

```markdown
### Phase 1: Discovery

4. **Investigate base classes and abstract classes**
   - Find abstract methods (MUST be implemented)
   - Find virtual methods (CAN be overridden)
   - Identify lifecycle hooks (shouldX, beforeX, afterX patterns)
   - Document interfaces that define contracts
```

### 3. **Strengthen "Common Patterns" Template Section**

**Current**: Generic pattern categories

**Improvement**: Add specific pattern types to look for

```markdown
## Common Patterns

### 1. <Lifecycle Hooks Pattern>

**When to use**: <Explain when this hook is called>
**Required for**: <List which scenarios require this>

\`\`\`typescript
// Show base implementation
// Show override pattern
// Show when to return what
\`\`\`

### 2. <State Management Pattern>

### 3. <Confirmation/Approval Pattern>

### 4. <Allowlisting/Caching Pattern>

### 5. <Streaming/Progressive Pattern>

### 6. <Error Handling Pattern>

### 7. <Abort/Cancellation Pattern>

<Repeat for all critical patterns>
```

### 4. **Add "Integration Lifecycle" Section Requirement**

**Current**: Template has "How Things Hook Into App" but doesn't require lifecycle documentation

**Improvement**: Add mandatory section to template

```markdown
## <System> Lifecycle

### Execution Flow

\`\`\`
<Show complete flow from trigger → validation → execution → completion>
<Include all state transitions>
<Show where hooks are called>
\`\`\`

### State Machine (if applicable)

**Location**: \`path/to/file.ts:lines\`

States and transitions:

1. **InitialState**: Description
2. **ProcessingState**: Description
3. **FinalState**: Description

**Triggers**:

- Event A → State X
- Event B → State Y
```

### 5. **Add "Advanced Patterns" Mandatory Section**

**Current**: Template only has "Common Patterns"

**Improvement**: Add new section after Common Patterns

```markdown
## Advanced Patterns

### 1. <Confirmation/Approval Workflows>

**When needed**: <Mutating operations, sensitive actions, etc.>
**Types**: <List all confirmation types with interfaces>
**Outcomes**: <List all possible outcomes>

\`\`\`typescript
<Complete example with all types>
\`\`\`

### 2. <State Persistence/Caching>

**When needed**: <Repeated operations, allowlisting, etc.>

\`\`\`typescript
<Complete example>
\`\`\`

### 3. <Progressive Output/Streaming>

**When needed**: <Long-running operations>

\`\`\`typescript
<Complete example>
\`\`\`
```

### 6. **Enhance "Important Rules" Template**

**Current**: Generic DO/DON'T structure

**Improvement**: Add category-specific rules

```markdown
### ✅ DO:

1. **Core Implementation**
   - Implement all abstract methods
   - Override optional lifecycle hooks when needed
   - Follow naming conventions

2. **Lifecycle & Hooks**
   - Implement confirmation for mutating operations
   - Return proper values from lifecycle hooks
   - Handle all possible outcomes

3. **State Management**
   - Implement caching/allowlisting for repeated operations
   - Persist user preferences appropriately

<Continue with 7-10 total categories>
```

### 7. **Add Explicit "Method Reference Table"**

**Current**: Methods are mentioned in text but not systematically listed

**Improvement**: Add mandatory section

```markdown
## Method Reference

| Method        | Required? | Purpose        | Return Type | When to Override |
| ------------- | --------- | -------------- | ----------- | ---------------- |
| \`method1()\` | Yes       | Core logic     | \`Type\`    | Always           |
| \`method2()\` | No        | Lifecycle hook | \`Type\`    | When X           |
| \`method3()\` | No        | Optional       | \`Type\`    | For Y use case   |

**Abstract methods** (MUST implement):

- \`abstractMethod1()\`: Description
- \`abstractMethod2()\`: Description

**Virtual methods** (CAN override):

- \`virtualMethod1()\`: Description, when to override
- \`virtualMethod2()\`: Description, when to override
```

### 8. **Improve Checklist Template**

**Current**: Generic checklist items

**Improvement**: Add method-specific checks

```markdown
## Quick Reference Checklist

When <doing the task>:

**Core Implementation:**

- [ ] Implement all abstract methods
- [ ] Define required interfaces

**Lifecycle Hooks:**

- [ ] Override \`shouldX()\` if system has side effects
- [ ] Override \`beforeX()\` if pre-processing needed
- [ ] Override \`afterX()\` if post-processing needed

**Integration:**

- [ ] Register in appropriate registry
- [ ] Add to integration point

**Testing:**

- [ ] Test all implemented methods
- [ ] Test all overridden hooks
- [ ] Test state transitions
- [ ] Test confirmation workflows
```

## Priority Ranking

### HIGH PRIORITY (Fix immediately)

1. ✅ Add "Identify ALL required methods" to Phase 2
2. ✅ Add "Base Class Investigation" step
3. ✅ Add "Advanced Patterns" mandatory section
4. ✅ Add "Method Reference Table" section

### MEDIUM PRIORITY (Next iteration)

5. Strengthen "Common Patterns" with specific categories
6. Add "Integration Lifecycle" section requirement
7. Enhance "Important Rules" with categories

### LOW PRIORITY (Nice to have)

8. Improve checklist with method-specific items

## Specific Template Changes

### Change 1: Research Guidelines Phase 2

**Before:**

```markdown
### Phase 2: Deep Dive

1. **Read critical files completely**
2. **Trace integration points**
3. **Check for documentation**
```

**After:**

```markdown
### Phase 2: Deep Dive

1. **Read critical files completely**
   - Read full implementations, don't skim
   - Understand the "why" behind patterns

2. **Identify ALL required methods and interfaces**
   - Find abstract methods (MUST be implemented)
   - Find virtual/override methods (CAN be overridden)
   - Document exact method signatures with types
   - Note which methods are lifecycle hooks (shouldX, beforeX, afterX)
   - Identify state machine methods if applicable

3. **Investigate base classes and abstract classes**
   - List all abstract methods that subclasses must implement
   - List all virtual methods available for override
   - Document when to override optional methods
   - Find patterns like confirmation, validation, lifecycle hooks

4. **Trace integration points**
   - How do pieces hook together?
   - What lifecycle stages exist?
   - Where are hooks called?
```

### Change 2: Add Mandatory Sections to Playbook Format

**Add after "Common Patterns" section:**

```markdown
## Advanced Patterns

<If the system has advanced workflows like confirmation, approval, streaming, caching, etc., document them here>

### 1. <Pattern Name> (e.g., Confirmation/Approval Workflows)

**When needed**: <Describe scenarios requiring this pattern>
**Location**: \`path/to/file.ts:lines\`

<Complete explanation of the pattern>

\`\`\`typescript
<Full code example showing the pattern>
<Include all types, interfaces, enums>
<Show all possible variations>
\`\`\`

### 2. <Another Advanced Pattern>

<Repeat for each advanced pattern found>

## Method Reference

<Document ALL methods available in the system>

### Required Methods (Abstract)

| Method        | Signature                  | Purpose     | Notes       |
| ------------- | -------------------------- | ----------- | ----------- |
| \`method1()\` | \`(params) => ReturnType\` | Description | When to use |

### Optional Methods (Virtual/Override)

| Method               | Signature                  | Purpose     | When to Override |
| -------------------- | -------------------------- | ----------- | ---------------- |
| \`virtualMethod1()\` | \`(params) => ReturnType\` | Description | Condition        |

**CRITICAL**: Identify all methods that MUST be implemented vs CAN be overridden.
```

### Change 3: Enhance Instructions Section

**Add to Instructions:**

```markdown
- **CRITICAL**: When researching, you MUST identify:
  - All abstract methods (required implementation)
  - All virtual methods (optional overrides)
  - All lifecycle hooks (shouldX, beforeX, afterX patterns)
  - All state transitions and workflows
  - All advanced patterns (confirmation, approval, streaming, caching, etc.)

- Use the Method Reference section to systematically list EVERY method, not just the common ones
- Document when each optional method SHOULD be overridden (not just that it CAN be)
```

## Summary

The template was good but **too generic** on method discovery. It needs:

1. **Explicit instructions** to find ALL methods (abstract + virtual)
2. **Mandatory sections** for advanced patterns and method references
3. **Lifecycle documentation** requirement
4. **Base class investigation** as a formal step

These changes will ensure agents:

- Don't miss critical lifecycle hooks
- Document all override opportunities
- Find advanced patterns like confirmations
- Create complete, accurate playbooks
