"""Tool module initialization and registration"""

def initialize_tools():
    """Initialize all tools by importing them, which triggers self-registration"""
    # Import all tool modules to trigger @ToolRegistry.register decorators
    # Mark registry as initialized
    from src.core.tool_registry import ToolRegistry

    from . import bash, edit, glob, grep, read, write
    ToolRegistry.mark_initialized()

# Export tool classes for backward compatibility if needed
# But they should not be imported directly anymore
from .bash import BashTool
from .edit import EditTool
from .glob import GlobTool
from .grep import GrepTool
from .read import ReadTool
from .write import WriteTool

__all__ = [
    "initialize_tools",
    "ReadTool",
    "WriteTool",
    "EditTool",
    "BashTool",
    "GlobTool",
    "GrepTool",
]
