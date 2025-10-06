# Playbook Creation Template

Create a new playbook in `.ai/playbooks/*.md` to document the `Topic` using the exact specified markdown `Playbook Format`. Follow the `Instructions` to create the playbook and use the `Research Guidelines` to thoroughly investigate the codebase.

## Instructions

- You're creating a comprehensive, AI-agent-optimized playbook that enables future AI agents to execute tasks without human intervention.
- Create the playbook in the `.ai/playbooks/*.md` file. Name it appropriately based on the `Topic` (e.g., `create-components.md`, `add-themes.md`, `setup-auth.md`).
- Use the `Playbook Format` below as your template.
- **CRITICAL**: This is NOT human documentation. This is an executable instruction set for AI agents. Be prescriptive, deterministic, and code-first.
- Research the codebase exhaustively before writing. Understand existing patterns, architecture, conventions, and file locations.
- IMPORTANT: Replace every `<placeholder>` in the `Playbook Format` with actual, specific, actionable content from your research.
- Use your reasoning model: THINK HARD about what an AI agent needs to successfully execute this task.
- Follow the principle: **Zero Ambiguity, Maximum Actionability**.

### Key Principles for Playbooks

1. **Code-First Approach**
   - Provide complete, copy-paste ready code examples
   - Show full file contents, not snippets
   - Include imports, types, implementation, and exports
   - Never use "..." or ellipsis - show the complete code

2. **Prescriptive, Not Descriptive**
   - ❌ Bad: "You can create components in various locations"
   - ✅ Good: "Create component at `packages/cli/src/ui/components/ComponentName.tsx`"

3. **Decision Trees Over Options**
   - Provide explicit if-then logic for choices
   - Use bullet points with conditions: "If X, then Y"
   - Create tables for multi-dimensional decisions

4. **Complete Context**
   - List ALL relevant files with line numbers
   - Show directory structures
   - Explain how pieces integrate (hierarchy, imports, flow)
   - Reference actual code from the codebase

5. **Verification-First**
   - End every major section with verification steps
   - Provide complete command sequences
   - Include expected outputs
   - Create checklists for validation

6. **Structured for LLM Parsing**
   - Use consistent heading hierarchy (h2 → h3 → h4)
   - Code blocks with language annotations
   - Tables for quick reference
   - Numbered steps for sequences

## Research Guidelines

Before writing the playbook, conduct thorough research:

### Phase 0: Task Comprehension (CRITICAL - DO THIS FIRST)

**STOP and verify you understand what to document:**

1. **Identify the scope**
   - Am I documenting **code implementation** (TypeScript files in packages/)?
   - OR am I documenting **user configuration** (TOML files, settings, end-user features)?
   - OR am I documenting **both**?

2. **If given examples, READ THEM FIRST**
   - Example: "adding slash commands like /help, /theme, /settings"
   - **REQUIRED**: Read the actual implementation files:
     - `packages/cli/src/ui/commands/helpCommand.ts`
     - `packages/cli/src/ui/commands/themeCommand.ts`
     - `packages/cli/src/ui/commands/settingsCommand.ts`
   - Understand: Are these TypeScript code files or TOML config files?
   - This determines your ENTIRE research direction

3. **Verify the target audience**
   - **AI agents adding code to the codebase** → Document TypeScript implementation patterns
   - **End users creating custom features** → Document configuration file formats
   - If unclear, assume **AI agents adding code to the codebase**

4. **Ask yourself:**
   - "Will the playbook tell an AI agent to create/modify TypeScript files?"
   - "Will the playbook tell an AI agent to create/modify config/TOML files?"
   - If both answers are no, you've misunderstood the task - re-read the prompt

**Checkpoint**: Before proceeding to Phase 1, you MUST know:

- [ ] What type of files will be created (`.ts`, `.tsx`, `.toml`, `.json`, etc.)
- [ ] Whether this is codebase development or user configuration
- [ ] What directory the new files will go in

### Phase 1: Discovery

1. **Read the examples first (if provided)**
   - If the prompt mentions specific features like `/help`, `/theme`
   - **Immediately** use Read tool to examine those exact implementations
   - Understand the pattern before searching broadly
   - This prevents documenting the wrong system

2. **Find all relevant files** using `Glob` tool
   - Search for file patterns related to the topic
   - Identify main implementation files
   - Locate test files
   - Find configuration files
   - **For code tasks**: Focus on `packages/*/src/**/*.ts` and `packages/*/src/**/*.tsx`
   - **For config tasks**: Focus on `.alfred/`, `~/.alfred/`, config directories

3. **Map the architecture**
   - Understand the directory structure
   - Identify key integration points
   - Trace the code flow
   - Document dependencies

4. **Study existing patterns**
   - Read 3-5 representative examples from the codebase
   - Identify common conventions (naming, exports, structure)
   - Note naming patterns
   - Understand import/export patterns

### Phase 2: Deep Dive

1. **Read critical files completely**
   - Don't skim - read full implementations
   - Understand the "why" behind patterns
   - Note edge cases and error handling
   - Identify testing approaches
   - **For code tasks**: Read the TypeScript interface/type definitions
   - **For config tasks**: Read the parser/loader code

2. **Trace integration points**
   - How do pieces hook together?
   - What contexts/state management is used?
   - What are the entry points?
   - Where are components/commands/features registered/initialized?
   - **For code tasks**: Find the registration/loader files
   - **For config tasks**: Find where config files are parsed and applied

3. **Check for documentation**
   - Review `CLAUDE.md` for project-specific rules
   - Check `docs/` for relevant context
   - Look for inline comments explaining patterns
   - Find TypeScript types/interfaces
   - **Distinguish**: Is existing docs for developers or end-users?

### Phase 3: Synthesis

1. **Organize findings**
   - Group by logical sections
   - Order by typical workflow (discover → create → integrate → test)
   - Create reference sections (file locations, available utilities, etc.)
   - **For code tasks**: Emphasize TypeScript patterns, imports, types, tests
   - **For config tasks**: Emphasize file format, syntax, validation, examples

2. **Identify gaps**
   - What might an AI agent not understand?
   - What assumptions need to be made explicit?
   - What errors might occur?
   - What verification is needed?

3. **Create complete examples**
   - Write full, working code examples (TypeScript for code tasks, TOML/JSON for config)
   - Show before/after states
   - Provide step-by-step instructions
   - Include test examples
   - **For code tasks**: Show complete files with imports, types, exports
   - **For config tasks**: Show complete config files with all fields

## Playbook Format

```md
# <Title: Action-Oriented Topic Name>

This playbook provides complete guidance for <brief description of what the AI agent will be able to do after reading this>.

## <System/Feature> Organization

### Directory Structure

\`\`\`
<show the complete directory tree relevant to this topic>
<use actual paths from the codebase>
<annotate what each directory/file is for>
\`\`\`

## <System/Feature> Categories

<If there are multiple types/categories, list them all with descriptions>

### 1. **<Category Name>** (\`path/to/files/\`)

<Description of what this category contains>
- **<Type/Subtype>**: \`Filename.tsx\`, \`AnotherFile.tsx\`
  - Description and purpose
  - When to use this type

### 2. **<Another Category>** (\`path/to/other/files/\`)

<Description>
- Files and their purposes

<Continue for all categories found in research>

## How <Things> Are Written

### Standard <Thing> Pattern

\`\`\`typescript
/\*\*

- @license
- Copyright 2025 Google LLC
- SPDX-License-Identifier: Apache-2.0
  \*/

<Show a complete, minimal, working example>
<Include all necessary imports>
<Show proper types/interfaces>
<Include implementation>
<Show export pattern>
\`\`\`

### Key Conventions

#### 1. <Convention Topic>

<Explain the convention>
- **Rule 1**: Description and example
- **Rule 2**: Description and example

**Example:**
\`\`\`typescript
<show code example>
\`\`\`

#### 2. <Another Convention>

<Detailed explanation>

<Repeat for all important conventions>

## Adding a New <Thing>: Step-by-Step

### Step 1: <First Step Name>

**Decision tree:**

- <Condition A> → \`path/to/location/A\`
- <Condition B> → \`path/to/location/B\`
- <Condition C> → \`path/to/location/C\`

### Step 2: <Second Step Name>

**File**: \`path/to/NewThing.tsx\`

\`\`\`typescript
<Complete, copy-paste ready code>
<No ellipsis, show everything>
\`\`\`

### Step 3: <Third Step Name>

**File**: \`path/to/NewThing.test.tsx\`

\`\`\`typescript
<Complete test file>
\`\`\`

### Step 4: <Integration Step>

**In parent file** (\`path/to/parent.tsx\`):

\`\`\`typescript
// Add import at top
<show exact import>

// Use in render
<show exact usage with context>
\`\`\`

### Step 5: <State Management Step (if applicable)>

**If the <thing> needs to be shown/hidden via state:**

1. **Add state to <StateContext>** (\`path/to/StateContext.tsx\`):
   \`\`\`typescript
   <show exact state addition>
   \`\`\`

2. **Add actions to <ActionsContext>** (\`path/to/ActionsContext.tsx\`):
   \`\`\`typescript
   <show exact action addition>
   \`\`\`

<Continue with all necessary steps>

## How <Things> Hook Into the App

### <System> Hierarchy

\`\`\`
<Show ASCII tree or diagram of how things connect>
<Be specific with component/file names>
<Show data/control flow>
\`\`\`

### Integration Points

#### 1. Via <Integration Point Name>

**File**: \`path/to/file.tsx:line_number\`

<Explain how things integrate here>
<Show code example>

**Example addition:**
\`\`\`typescript
<show how to add new thing to this integration point>
\`\`\`

**Existing <things> managed here:**

- \`condition1\` → \`Thing1\`
- \`condition2\` → \`Thing2\`
  <list all existing patterns>

#### 2. Via <Another Integration Point>

<Repeat for all integration points>

## State Management

### <Context/State System Name>

<Things> access state via <context/hook system>:

\`\`\`typescript
<show complete example of using state>
\`\`\`

**Available <Contexts/Hooks>:**

#### <ContextName>

**<Description of what this provides>**

\`\`\`typescript
<show usage example>
\`\`\`

**Key properties:**

- \`property1: Type\` - Description of what this does
- \`property2: Type\` - Description
  <list all important properties>

Full interface at \`path/to/ContextFile.tsx:line_number\`

<Repeat for all relevant contexts/state systems>

## Testing Patterns

### Test Structure

\`\`\`typescript
<Show complete test file template>
<Include imports, setup, teardown, test cases>
\`\`\`

### Testing Tools

**<Tool Name>:**

- \`function()\` - What it does
- \`anotherFunction()\` - What it does

**<Another Tool>:**

- Functions and descriptions

### Mocking <Things>

<Show how to mock dependencies>

\`\`\`typescript
<Complete mocking example>
\`\`\`

### Testing Examples from Codebase

**<Test pattern name>** (\`path/to/test.tsx:line_number\`):
\`\`\`typescript
<actual test from codebase>
\`\`\`

<Show 2-3 real examples>

## Common Patterns

### 1. <Pattern Name>

\`\`\`typescript
// <Description>
<code example>

// <Another variation>
<code example>
\`\`\`

### 2. <Another Pattern>

<Repeat for all common patterns>

## Important Rules

### ✅ DO:

1. **<Rule category>**
   - Specific do instruction
   - Another specific do instruction

2. **<Another rule category>**
   - Instructions

<List 5-10 critical DOs>

### ❌ DON'T:

1. **Never <anti-pattern>** - Explanation and alternative
2. **Never <another anti-pattern>** - Explanation and alternative

<List 5-10 critical DON'Ts>

## Verification Workflow

**Before considering <task> work complete:**

\`\`\`bash

# 1. <Step name>

<exact command>

# 2. <Step name>

<exact command>

# Continue for all verification steps

\`\`\`

**Or use the comprehensive preflight check:**
\`\`\`bash
<single command if available>
\`\`\`

This runs: \`<list what it does>\`

**After any code changes:**

- Restart the entire verification cycle
- Never declare done without all checks passing
- <Any other critical verification rules>

## File Location Reference

**<Thing> files:**

- <Category>: \`path/to/files/[ThingName].tsx\`
- <Another category>: \`path/to/other/files/[ThingName].tsx\`

**Test files:**

- Co-located: \`path/to/files/[ThingName].test.tsx\`

**Integration points:**

- <Integration point>: \`path/to/integration.tsx:line_number\`
- <Another point>: \`path/to/another.tsx:line_number\`

**State management:**

- <State file>: \`path/to/state.tsx:line_number\`
- <Actions file>: \`path/to/actions.tsx:line_number\`

**<Other relevant categories>:**

- File paths with line numbers

## Additional Resources

- **<Resource name>**: \`path/to/resource\` - Description
- **<Another resource>**: URL or path - Description
- **Project guidelines**: \`/CLAUDE.md\` and \`.claude/CLAUDE.md\`

## Quick Reference Checklist

When <doing the task>:

- [ ] <Step 1 - specific and actionable>
- [ ] <Step 2>
- [ ] <Step 3>
- [ ] <Step 4>
- [ ] <Step 5>
- [ ] <Step 6>
- [ ] <Step 7>
- [ ] Run \`<verification command>\`
- [ ] Run \`<another verification command>\`
- [ ] <Final verification step>

<Include 10-20 checklist items covering the complete workflow>
```

## Topic

$ARGUMENTS
