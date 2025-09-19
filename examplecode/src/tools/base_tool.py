from abc import ABC, abstractmethod
from typing import Union
from src.core.tool_definition import ToolDefinition
from src.core.tool_response import ToolResponse


class BaseTool(ABC):
    """Abstract base class for all tools"""

    @property
    @abstractmethod
    def definition(self) -> ToolDefinition:
        """Return the tool definition for this tool"""
        pass

    def execute(self, **kwargs) -> str:
        """Execute the tool with the given arguments"""
        # Use the function from the definition
        return self.definition.function(**kwargs)
    
    def _create_error_response(self, message: str) -> ToolResponse:
        """Create a standardized error response"""
        return ToolResponse(
            success=False,
            display_content=message,
            raw_result=f"Error: {message}"
        )
    
    def _create_success_response(self, display_content: str, raw_result: str) -> ToolResponse:
        """Create a standardized success response"""
        return ToolResponse(
            success=True,
            display_content=display_content,
            raw_result=raw_result
        )
