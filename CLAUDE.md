# Alfred CLI Development Guidelines

## Core Philosophy

Simplicity is the ultimate sophistication. Always choose the simplest solution that works. Avoid over-engineering at all costs.

## Development Principles

### 1. KISS (Keep It Simple, Stupid)
- **Never over-engineer**. If a simple function works, don't create a class
- If a single file suffices, don't create a module
- Start simple, refactor only when necessary
- Prefer readable code over "clever" code

### 2. Research Before Implementation
- Always use Perplexity to research framework best practices
- Look up the latest patterns and APIs before implementing
- Don't assume - verify with current documentation
- Check if a well-maintained library already solves the problem

### 3. Code Reusability
- Before creating a new file, check if existing code can be:
  - Extended
  - Refactored
  - Reused
- Don't duplicate functionality - extract and share
- If you're copying code, you're doing it wrong

### 4. Single Responsibility Principle (SRP)
- Each module should have one reason to change
- Each function should do one thing well
- Each class should have one responsibility
- If you use "and" to describe what something does, split it

### 5. DRY (Don't Repeat Yourself)
- Extract common functionality into utilities
- Use constants for repeated values
- Create helper functions for repeated operations
- But don't abstract prematurely - wait for the third occurrence

## Clean Code Principles (Uncle Bob)

### Naming
```python
# BAD
def calc(x, y):
    return x * 0.1 + y

# GOOD
def calculate_total_with_tax(price: float, tax_amount: float) -> float:
    return price * TAX_RATE + tax_amount
```

### Functions
- Small: Functions should be 20 lines or less
- Do One Thing: Functions should do one thing at one level of abstraction
- One Level of Abstraction: Don't mix levels of abstraction
- Descriptive Names: Long descriptive names > short cryptic names
- Few Arguments: Ideal = 0, Good = 1-2, Requires justification = 3+

### Comments
- Code should be self-documenting
- Comments should explain why, not what
- Update comments when code changes
- Delete commented-out code immediately
- Never use emojis in comments or code

```python
# BAD - Comment explains what
# Multiply price by 1.1 to add tax
total = price * 1.1

# GOOD - Comment explains why
# Australian GST rate as of 2024
GST_RATE = 0.1
total = price * (1 + GST_RATE)
```

### Error Handling
- Use exceptions, not error codes
- Provide context with exceptions
- Don't return null - use Optional or raise exceptions
- Fail fast and loud

## Technical Standards

### Configuration Management
Always use Pydantic Settings for configuration:

```python
# GOOD - Use Pydantic Settings
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    api_key: str = Field(..., env='ANTHROPIC_API_KEY')
    model: str = Field(default='claude-3-5-sonnet-20241022')

    class Config:
        env_file = '.env'
        case_sensitive = False

# BAD - Manual config handling
import os
config = {
    'api_key': os.getenv('ANTHROPIC_API_KEY'),
    'model': os.getenv('MODEL', 'claude-3-5-sonnet-20241022')
}
```

### Data Validation
Always use Pydantic for data models:

```python
# GOOD - Pydantic validation
from pydantic import BaseModel, validator

class Message(BaseModel):
    role: str
    content: str

    @validator('role')
    def validate_role(cls, v):
        if v not in ['user', 'assistant', 'system']:
            raise ValueError('Invalid role')
        return v

# BAD - Dict without validation
message = {
    'role': role,  # No validation
    'content': content
}
```

### Type Hints
- Always use type hints for function signatures
- Use Optional for nullable values
- Use Union sparingly - prefer specific types
- Use TypedDict for complex dictionaries

```python
from typing import Optional, List, Dict

# GOOD
def process_messages(
    messages: List[Message],
    max_tokens: Optional[int] = None
) -> str:
    pass

# BAD
def process_messages(messages, max_tokens=None):
    pass
```

## Architecture Guidelines

### File Organization
1. Check existing files first - extend before creating new
2. Keep related functionality together
3. Prefer fewer, cohesive files over many tiny files
4. Split only when file exceeds 300-400 lines

### Module Structure
```python
# Preferred module structure
"""Module docstring explaining purpose."""

# Standard library imports
import os
from typing import Optional

# Third-party imports
from pydantic import BaseModel

# Local imports
from alfred.config import Settings

# Constants
DEFAULT_TIMEOUT = 30

# Classes and functions
class MyClass:
    pass
```

### Dependency Management
- Inject dependencies, don't hard-code them
- Use dependency injection for testing
- Avoid circular imports
- Keep dependency tree shallow

## Code Review Checklist

Before committing code, ensure:

1. Simplicity
   - Is this the simplest solution?
   - Can this be done with existing code?
   - Am I over-engineering?

2. Clean Code
   - Are names descriptive and intention-revealing?
   - Are functions small and focused?
   - Is there duplicated code that should be extracted?
   - Are there magic numbers that should be constants?

3. Standards
   - Am I using Pydantic for data models?
   - Am I using Pydantic Settings for config?
   - Do all functions have type hints?
   - Is error handling explicit and informative?

4. Testing
   - Can this code be easily tested?
   - Are there side effects that make testing difficult?
   - Is the code modular enough for unit testing?

## Anti-Patterns to Avoid

### Over-Abstraction
```python
# BAD - Over-engineered for simple addition
class MathematicalOperationFactory:
    def create_addition_operator(self):
        return AdditionOperator()

class AdditionOperator:
    def execute(self, a, b):
        return a + b

# GOOD - Simple and clear
def add(a: float, b: float) -> float:
    return a + b
```

### Premature Optimization
- Don't optimize until you measure
- Readable code > marginally faster code
- Profile before optimizing

### God Objects
- Avoid classes that do everything
- Split large classes into focused components
- If a class has more than 7-10 methods, reconsider

### Deep Nesting
```python
# BAD - Deep nesting
if condition1:
    if condition2:
        if condition3:
            do_something()

# GOOD - Early returns
if not condition1:
    return
if not condition2:
    return
if not condition3:
    return
do_something()
```

## Refactoring Rules

1. Rule of Three: Extract common code on the third duplication
2. Boy Scout Rule: Leave code cleaner than you found it
3. Refactor Before Adding: Clean existing code before adding features
4. Small Steps: Make small, incremental changes
5. Test First: Ensure tests pass before and after refactoring

## Documentation Standards

### When to Document
- Public APIs always need docstrings
- Complex algorithms need explanation
- Business logic needs context
- "Why" decisions need comments

### Docstring Format
```python
def calculate_relevance_score(
    query: str,
    document: str,
    weights: Optional[Dict[str, float]] = None
) -> float:
    """Calculate relevance score between query and document.

    Uses TF-IDF algorithm with optional weight adjustments
    for domain-specific terms.

    Args:
        query: Search query string
        document: Document content to score
        weights: Optional term weights for adjustment

    Returns:
        Relevance score between 0.0 and 1.0

    Raises:
        ValueError: If query or document is empty
    """
    pass
```

## Development Workflow

1. Research First: Use Perplexity to understand the problem domain
2. Check Existing Code: Can we extend what we have?
3. Design Simply: What's the simplest thing that could work?
4. Implement Cleanly: Follow Clean Code principles
5. Validate Early: Use Pydantic for data validation
6. Test Thoroughly: Write tests as you go
7. Refactor Continuously: Improve as you learn

## Remember

"Simplicity is the soul of efficiency" - Austin Freeman

- Perfect is the enemy of good
- Working code > perfect architecture
- Clear code > clever code
- Today's code > tomorrow's framework

When in doubt:
1. Choose the simpler solution
2. Ask if you're over-engineering
3. Check if existing code can help
4. Follow YAGNI (You Aren't Gonna Need It)

This document should be treated as a living guide. Update it as the project evolves, but always maintain the core principle: Keep It Simple.