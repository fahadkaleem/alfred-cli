# Alfred CLI - Technical Design Document

## Overview
Alfred CLI is a modular, extensible AI chat agent built with Anthropic's SDK, featuring a rich terminal interface powered by Rich and prompt_toolkit. This document outlines the implementation phases, interfaces, and contracts for building the system.

## Directory Structure
```
alfred_cli/
├── alfred/
│   ├── __init__.py
│   ├── agent.py          # AnthropicAgent class
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── base.py       # Base Tool interface
│   │   ├── registry.py   # Tool discovery/registration
│   │   └── [tools]       # Individual tool implementations
│   ├── cli/              # Terminal UI components
│   │   ├── __init__.py
│   │   ├── chat.py       # Main chat interface
│   │   ├── input_box.py  # Rich + prompt_toolkit input
│   │   └── renderer.py   # Message rendering
│   ├── config.py         # Settings and configuration
│   └── context.py        # Conversation manager
├── main.py               # CLI entry point
├── pyproject.toml        # Dependencies
├── .env.example
└── README.md
```

## Implementation Phases

---

## Phase 1: Project Bootstrap

### Objectives
- Initialize project structure with uv
- Set up dependencies and configuration
- Create base directory structure

### Tasks
1. Initialize uv project
2. Create directory structure as specified
3. Configure pyproject.toml with dependencies
4. Create .env.example file
5. Set up basic logging configuration

### Dependencies (pyproject.toml)
```toml
[project]
name = "alfred-cli"
version = "0.1.0"
dependencies = [
    "anthropic>=0.30.0",
    "rich>=13.0.0",
    "prompt_toolkit>=3.0.0",
    "python-dotenv>=1.0.0",
    "click>=8.1.0",
    "pydantic>=2.0.0",
    "pyyaml>=6.0",
]
```

### Environment Variables (.env.example)
```
ANTHROPIC_API_KEY=your_api_key_here
ALFRED_MODEL=claude-3-5-sonnet-20241022
ALFRED_MAX_TOKENS=4096
ALFRED_TEMPERATURE=0.7
```

### Deliverables
- Working project structure
- Dependency management configured
- Environment template ready

---

## Phase 2: Core Components

### Objectives
Build the foundational components that other modules will depend on.

### 2.1 Configuration Module (alfred/config.py)

#### Interface: Settings
```python
from pydantic import BaseModel
from typing import Optional, Literal

class Settings(BaseModel):
    """Configuration settings for Alfred CLI"""

    # API Configuration
    anthropic_api_key: str
    model: str = "claude-3-5-sonnet-20241022"
    max_tokens: int = 4096
    temperature: float = 0.7

    # UI Configuration
    theme: Literal["default", "dark", "light"] = "default"
    input_box_style: str = "rounded"
    message_width: Optional[int] = None

    # Behavior Configuration
    stream_responses: bool = True
    save_history: bool = True
    history_file: str = "~/.alfred/history.json"

    @classmethod
    def from_env(cls) -> "Settings":
        """Load settings from environment variables"""
        pass

    def validate_api_key(self) -> bool:
        """Validate the Anthropic API key"""
        pass
```

### 2.2 Context Manager (alfred/context.py)

#### Interface: ConversationContext
```python
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum

class MessageRole(Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"

@dataclass
class Message:
    """Single message in conversation"""
    role: MessageRole
    content: str
    metadata: Optional[Dict] = None
    tool_calls: Optional[List[Dict]] = None

class ConversationContext:
    """Manages conversation history and context window"""

    def __init__(self, max_tokens: int = 100000):
        """Initialize with maximum context window"""
        pass

    def add_message(self, message: Message) -> None:
        """Add a message to the conversation"""
        pass

    def get_messages(self) -> List[Message]:
        """Get all messages within context window"""
        pass

    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        pass

    def trim_to_fit(self) -> None:
        """Trim older messages to fit context window"""
        pass

    def clear(self) -> None:
        """Clear all messages"""
        pass

    def save_to_file(self, filepath: str) -> None:
        """Save conversation to file"""
        pass

    def load_from_file(self, filepath: str) -> None:
        """Load conversation from file"""
        pass
```

### 2.3 Agent Module (alfred/agent.py)

#### Interface: AnthropicAgent
```python
from typing import Iterator, Optional, Dict, List, Callable
from abc import ABC, abstractmethod

class AgentResponse:
    """Response from the agent"""
    content: str
    tool_calls: Optional[List[Dict]]
    usage: Optional[Dict]

class StreamChunk:
    """Single chunk in streaming response"""
    delta: str
    is_tool_call: bool
    metadata: Optional[Dict]

class AnthropicAgent:
    """Core agent that interfaces with Anthropic API"""

    def __init__(self, api_key: str, model: str, tool_registry: Optional["ToolRegistry"] = None):
        """Initialize agent with API credentials and optional tools"""
        pass

    def send_message(self,
                    message: str,
                    context: ConversationContext,
                    stream: bool = True) -> Union[AgentResponse, Iterator[StreamChunk]]:
        """Send a message and get response"""
        pass

    def handle_tool_call(self, tool_call: Dict) -> str:
        """Execute a tool call and return result"""
        pass

    def validate_connection(self) -> bool:
        """Test connection to Anthropic API"""
        pass

    @property
    def available_tools(self) -> List[Dict]:
        """Get list of available tools in Anthropic format"""
        pass
```

### Deliverables
- Configuration system with validation
- Context manager with token counting
- Agent interface with streaming support

---

## Phase 3: Tool System

### Objectives
Create an extensible tool/plugin system for the agent.

### 3.1 Base Tool Interface (alfred/tools/base.py)

#### Interface: Tool
```python
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from pydantic import BaseModel

class ToolParameter(BaseModel):
    """Parameter definition for a tool"""
    name: str
    type: str
    description: str
    required: bool = True
    default: Any = None

class Tool(ABC):
    """Base class for all tools"""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique name for the tool"""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Description of what the tool does"""
        pass

    @property
    @abstractmethod
    def parameters(self) -> List[ToolParameter]:
        """List of parameters the tool accepts"""
        pass

    @abstractmethod
    def execute(self, **kwargs) -> str:
        """Execute the tool with given parameters"""
        pass

    def validate_params(self, **kwargs) -> bool:
        """Validate parameters before execution"""
        pass

    def to_anthropic_format(self) -> Dict:
        """Convert to Anthropic tool format"""
        pass
```

### 3.2 Tool Registry (alfred/tools/registry.py)

#### Interface: ToolRegistry
```python
from typing import Dict, List, Optional, Type
import importlib
import os

class ToolRegistry:
    """Registry for discovering and managing tools"""

    def __init__(self, auto_discover: bool = True):
        """Initialize registry, optionally auto-discover tools"""
        pass

    def register(self, tool_class: Type[Tool]) -> None:
        """Register a tool class"""
        pass

    def register_instance(self, tool: Tool) -> None:
        """Register a tool instance"""
        pass

    def get(self, name: str) -> Optional[Tool]:
        """Get a tool by name"""
        pass

    def list_tools(self) -> List[str]:
        """List all registered tool names"""
        pass

    def get_anthropic_tools(self) -> List[Dict]:
        """Get all tools in Anthropic format"""
        pass

    def execute(self, name: str, **kwargs) -> str:
        """Execute a tool by name"""
        pass

    def auto_discover(self, path: str = "alfred/tools") -> None:
        """Auto-discover and register tools from directory"""
        pass
```

### 3.3 Example Tool Implementation

#### Example: Calculator Tool
```python
from alfred.tools.base import Tool, ToolParameter

class CalculatorTool(Tool):
    """Basic calculator tool"""

    @property
    def name(self) -> str:
        return "calculator"

    @property
    def description(self) -> str:
        return "Performs mathematical calculations"

    @property
    def parameters(self) -> List[ToolParameter]:
        return [
            ToolParameter(
                name="expression",
                type="string",
                description="Mathematical expression to evaluate",
                required=True
            )
        ]

    def execute(self, expression: str) -> str:
        """Safely evaluate mathematical expression"""
        # Implementation with safe evaluation
        pass
```

### Deliverables
- Base Tool interface defined
- Tool registry with auto-discovery
- 2-3 example tools (calculator, file_reader, web_search)

---

## Phase 4: CLI Interface Components

### Objectives
Build the Rich-based terminal UI components with prompt_toolkit integration.

### 4.1 Input Box (alfred/cli/input_box.py)

#### Interface: InputBox
```python
from rich.panel import Panel
from prompt_toolkit import PromptSession
from typing import Optional, Callable

class InputBox:
    """Multi-line input box with Rich styling"""

    def __init__(self,
                 title: str = "Input",
                 border_style: str = "cyan",
                 box_style: str = "rounded",
                 multiline: bool = True):
        """Initialize input box with styling options"""
        pass

    def get_input(self,
                  prompt: str = "> ",
                  on_enter: Optional[Callable] = None,
                  on_escape: Optional[Callable] = None) -> str:
        """Get input from user with event handlers"""
        pass

    def render_panel(self, content: str) -> Panel:
        """Render current content as Rich panel"""
        pass

    def clear(self) -> None:
        """Clear input box content"""
        pass

    @property
    def is_empty(self) -> bool:
        """Check if input box is empty"""
        pass
```

### 4.2 Message Renderer (alfred/cli/renderer.py)

#### Interface: MessageRenderer
```python
from rich.console import Console, ConsoleOptions
from rich.panel import Panel
from rich.syntax import Syntax
from typing import Literal

class MessageRenderer:
    """Renders messages with Rich formatting"""

    def __init__(self, console: Console):
        """Initialize with Rich console"""
        pass

    def render_user_message(self, content: str) -> Panel:
        """Render user message with blue styling"""
        pass

    def render_assistant_message(self, content: str) -> Panel:
        """Render assistant message with green styling"""
        pass

    def render_tool_output(self, tool_name: str, output: str) -> Panel:
        """Render tool output with yellow styling"""
        pass

    def render_error(self, error: str) -> Panel:
        """Render error message with red styling"""
        pass

    def render_code_block(self, code: str, language: str = "python") -> Syntax:
        """Render code with syntax highlighting"""
        pass

    def render_streaming_indicator(self) -> None:
        """Show streaming/thinking indicator"""
        pass
```

### 4.3 Main Chat Interface (alfred/cli/chat.py)

#### Interface: ChatInterface
```python
from rich.layout import Layout
from rich.live import Live
from typing import Optional, List

class ChatInterface:
    """Main chat interface combining all UI components"""

    def __init__(self,
                 agent: AnthropicAgent,
                 context: ConversationContext,
                 renderer: MessageRenderer,
                 input_box: InputBox):
        """Initialize with required components"""
        pass

    def setup_layout(self) -> Layout:
        """Create Rich layout with chat history and input areas"""
        pass

    def run(self) -> None:
        """Main chat loop"""
        pass

    def handle_user_input(self, message: str) -> None:
        """Process user input and get response"""
        pass

    def handle_streaming_response(self, stream: Iterator[StreamChunk]) -> None:
        """Handle streaming response from agent"""
        pass

    def handle_command(self, command: str) -> bool:
        """Handle slash commands, return True if handled"""
        pass

    def display_help(self) -> None:
        """Display help information"""
        pass

    def save_conversation(self) -> None:
        """Save current conversation"""
        pass

    def load_conversation(self, filepath: str) -> None:
        """Load conversation from file"""
        pass

    def cleanup(self) -> None:
        """Cleanup on exit"""
        pass
```

### Deliverables
- Input box with bordered styling
- Message renderer with syntax highlighting
- Main chat interface with layout management

---

## Phase 5: Command System

### Objectives
Implement slash commands and meta commands for enhanced functionality.

### 5.1 Command Interface

#### Interface: Command
```python
from abc import ABC, abstractmethod
from typing import List, Optional

class Command(ABC):
    """Base class for commands"""

    @property
    @abstractmethod
    def name(self) -> str:
        """Command name (without slash)"""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Command description for help"""
        pass

    @property
    @abstractmethod
    def usage(self) -> str:
        """Usage string"""
        pass

    @abstractmethod
    def execute(self, args: List[str], interface: ChatInterface) -> None:
        """Execute the command"""
        pass
```

### 5.2 Built-in Commands

#### Commands to Implement
- `/help` - Show available commands
- `/clear` - Clear conversation history
- `/save [filename]` - Save conversation
- `/load [filename]` - Load conversation
- `/tools` - List available tools
- `/model [name]` - Switch model
- `/exit` or `/quit` - Exit application
- `/export [format]` - Export conversation (markdown, json)
- `/config` - Show current configuration
- `/theme [name]` - Change UI theme

### Deliverables
- Command base class
- Command registry/handler
- Implementation of all built-in commands

---

## Phase 6: Integration

### Objectives
Wire all components together into a working application.

### 6.1 Main Application (main.py)

#### Interface: Main CLI Application
```python
import click
from typing import Optional

@click.command()
@click.option('--model', default=None, help='Model to use')
@click.option('--api-key', envvar='ANTHROPIC_API_KEY', help='API key')
@click.option('--no-stream', is_flag=True, help='Disable streaming')
@click.option('--load', type=click.Path(exists=True), help='Load conversation')
@click.option('--theme', type=click.Choice(['default', 'dark', 'light']), default='default')
def main(model: Optional[str],
         api_key: str,
         no_stream: bool,
         load: Optional[str],
         theme: str):
    """Alfred CLI - AI Chat Assistant"""
    pass
```

### 6.2 Application Flow

1. **Initialization**
   - Load configuration
   - Validate API key
   - Initialize agent
   - Setup tool registry
   - Create UI components

2. **Main Loop**
   - Display welcome message
   - Handle user input
   - Process commands
   - Send to agent
   - Display responses
   - Handle interrupts

3. **Cleanup**
   - Save conversation if configured
   - Close connections
   - Display goodbye message

### Deliverables
- Complete main.py implementation
- Application lifecycle management
- Error handling and recovery
- Signal handling (Ctrl+C)

---

## Phase 7: Polish & Features

### Objectives
Add advanced features and polish the user experience.

### 7.1 Advanced Features

#### Features to Implement
1. **Syntax Highlighting**
   - Auto-detect language in code blocks
   - Support multiple languages
   - Copy code to clipboard

2. **Markdown Rendering**
   - Headers, lists, tables
   - Bold, italic, code
   - Links (clickable in supported terminals)

3. **Session Management**
   - Auto-save on exit
   - Session recovery after crash
   - Multiple named sessions

4. **Search**
   - Search within conversation
   - Regex support
   - Highlight matches

5. **Export Options**
   - Export to Markdown
   - Export to JSON
   - Export to HTML

6. **Keyboard Shortcuts**
   - Ctrl+L: Clear screen
   - Ctrl+S: Save conversation
   - Ctrl+F: Search
   - Ctrl+R: Reload last response
   - Tab: Auto-complete commands

### 7.2 Performance Optimizations

1. **Lazy Loading**
   - Load tools on demand
   - Defer imports where possible

2. **Caching**
   - Cache tool descriptions
   - Cache rendered messages

3. **Async Operations**
   - Async tool execution
   - Background saves

### Deliverables
- All advanced features implemented
- Performance optimizations
- Smooth user experience

---

## Phase 8: Testing & Documentation

### Objectives
Ensure reliability and provide comprehensive documentation.

### 8.1 Testing Strategy

#### Test Structure
```
tests/
├── unit/
│   ├── test_agent.py
│   ├── test_context.py
│   ├── test_tools.py
│   └── test_renderer.py
├── integration/
│   ├── test_chat_flow.py
│   └── test_tool_execution.py
└── fixtures/
    └── sample_conversations.json
```

#### Test Coverage Requirements
- Core components: >90%
- Tools: >80%
- UI components: >70%
- Integration: Key workflows

### 8.2 Documentation

#### README.md Structure
1. **Quick Start**
   - Installation
   - Configuration
   - First run

2. **Features**
   - Core capabilities
   - Available tools
   - Commands

3. **Configuration**
   - Environment variables
   - Config file options
   - Themes

4. **Development**
   - Adding tools
   - Creating commands
   - Contributing

#### Additional Documentation
- `CONTRIBUTING.md` - Contribution guidelines
- `docs/tools.md` - Tool development guide
- `docs/api.md` - API documentation
- `examples/` - Example tools and configurations

### Deliverables
- Comprehensive test suite
- Full documentation
- Example configurations
- Contributing guidelines

---

## Error Handling Strategy

### Global Error Handling
```python
class AlfredError(Exception):
    """Base exception for Alfred CLI"""
    pass

class ConfigurationError(AlfredError):
    """Configuration-related errors"""
    pass

class APIError(AlfredError):
    """API communication errors"""
    pass

class ToolExecutionError(AlfredError):
    """Tool execution errors"""
    pass
```

### Error Recovery
1. **API Errors**: Retry with exponential backoff
2. **Tool Errors**: Catch, log, return error message
3. **UI Errors**: Graceful degradation
4. **Fatal Errors**: Save state, clean exit

---

## Security Considerations

1. **API Key Management**
   - Never log API keys
   - Use environment variables
   - Validate before use

2. **Tool Execution**
   - Sandbox dangerous operations
   - Validate all inputs
   - Rate limiting

3. **File Operations**
   - Validate paths
   - Prevent directory traversal
   - Check permissions

4. **Network Operations**
   - Validate URLs
   - Timeout settings
   - SSL verification

---

## Performance Guidelines

1. **Startup Time**
   - Target: <500ms
   - Lazy load heavy imports
   - Profile regularly

2. **Response Time**
   - First token: <1s
   - Stream smoothly
   - Buffer appropriately

3. **Memory Usage**
   - Trim context regularly
   - Clean up resources
   - Monitor for leaks

---

## Success Criteria

### Phase Completion Checklist
- [ ] All interfaces implemented
- [ ] Tests passing (>80% coverage)
- [ ] Documentation complete
- [ ] Code review completed
- [ ] Integration tested
- [ ] Performance benchmarked

### Final Acceptance Criteria
1. Clean, intuitive CLI interface
2. Streaming responses work smoothly
3. Tools execute reliably
4. Commands work as expected
5. Error handling is robust
6. Performance meets targets
7. Documentation is comprehensive

---

## Appendix: Code Style Guidelines

### Python Style
- Follow PEP 8
- Use type hints
- Document all public methods
- Keep functions under 50 lines
- Keep files under 500 lines

### Naming Conventions
- Classes: PascalCase
- Functions/methods: snake_case
- Constants: UPPER_SNAKE_CASE
- Private: _leading_underscore

### Documentation
- Docstrings for all public APIs
- Type hints for all parameters
- Examples in complex functions
- README for each module

---

This design document provides the blueprint for implementing Alfred CLI. Each phase builds upon the previous, ensuring a solid foundation and maintainable codebase.