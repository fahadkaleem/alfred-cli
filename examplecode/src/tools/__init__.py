"""Tool module initialization and registration"""

def initialize_tools():
    """Initialize all tools by importing them, which triggers self-registration"""
    # Import all tool modules to trigger @ToolRegistry.register decorators
    from . import read
    from . import write
    from . import edit
    from . import bash
    from . import glob
    from . import grep
    
    # Mark registry as initialized
    from src.core.tool_registry import ToolRegistry
    ToolRegistry.mark_initialized()

# Export tool classes for backward compatibility if needed
# But they should not be imported directly anymore
from .read import ReadTool
from .write import WriteTool
from .edit import EditTool
from .bash import BashTool
from .glob import GlobTool
from .grep import GrepTool

__all__ = [
    "initialize_tools",
    "ReadTool",
    "WriteTool",
    "EditTool",
    "BashTool",
    "GlobTool",
    "GrepTool",
]
