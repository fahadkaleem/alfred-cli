"""Simple console renderer for tool responses"""
from rich.console import Console
from typing import Dict, Any
from src.core.tool_response import ToolResponse
from src.utils.path_utils import get_relative_path

console = Console()


class ConsoleRenderer:
    """Renders tool responses to console"""
    
    def render(self, tool_name: str, tool_input: Dict[str, Any], response: ToolResponse) -> None:
        """Render tool response to console"""
        # Get the main parameter for display
        main_param = self._extract_main_param(tool_name, tool_input)
        
        # Green dot for success, red for error
        dot = "[green]⏺[/green]" if response.success else "[red]⏺[/red]"
        
        # Display the response
        console.print(f"\n{dot} {tool_name}({main_param})")
        
        # Display content with proper indentation for multi-line content
        lines = response.display_content.split('\n')
        console.print(f"  └─ {lines[0]}")
        for line in lines[1:]:
            console.print(f"     {line}")
    
    def _extract_main_param(self, tool_name: str, tool_input: Dict[str, Any]) -> str:
        """Extract the main parameter for display"""
        # Map tool names to their main parameter
        param_mapping = {
            "Read": "file_path",
            "Write": "file_path", 
            "Edit": "file_path",
            "List": "path",
            "Bash": "command",
            "Glob": "pattern",
            "Grep": "pattern"
        }
        
        # Get the parameter name for this tool
        param_name = param_mapping.get(tool_name)
        if not param_name:
            # Fallback: try common parameter names
            for key in ["file_path", "path", "command", "pattern"]:
                if key in tool_input:
                    param_name = key
                    break
        
        # Get the value and convert to relative path if it's a file path
        if param_name and param_name in tool_input:
            value = tool_input[param_name]
            if param_name in ["file_path", "path"] and value != ".":
                value = get_relative_path(value)
            # Truncate long commands for display
            if param_name == "command" and len(value) > 50:
                value = value[:50] + "..."
            return value
        
        # Fallback to empty string
        return ""