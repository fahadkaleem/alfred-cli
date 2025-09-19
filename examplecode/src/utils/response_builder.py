from src.core.tool_response import ToolResponse
from src.utils.path_utils import get_relative_path


class ResponseBuilder:
    """Centralized builder for consistent ToolResponse creation"""
    
    @staticmethod
    def success(display_content: str, raw_result: str = None) -> ToolResponse:
        """Create a successful response"""
        return ToolResponse(
            success=True,
            display_content=display_content,
            raw_result=raw_result if raw_result is not None else display_content
        )
    
    @staticmethod
    def error(message: str, details: str = None) -> ToolResponse:
        """Create an error response"""
        full_message = message if details is None else f"{message}: {details}"
        return ToolResponse(
            success=False,
            display_content=full_message,
            raw_result=full_message
        )
    
    @staticmethod
    def file_not_found(file_path: str) -> ToolResponse:
        """Create a file not found error response"""
        relative_path = get_relative_path(file_path)
        return ToolResponse(
            success=False,
            display_content=f"File not found: {relative_path}",
            raw_result=f"Error: File {file_path} does not exist"
        )
    
    @staticmethod
    def file_read_success(line_count: int, content: str) -> ToolResponse:
        """Create a successful file read response"""
        return ToolResponse(
            success=True,
            display_content=f"Read {line_count} lines",
            raw_result=content
        )
    
    @staticmethod
    def file_write_success(file_path: str, content_length: int) -> ToolResponse:
        """Create a successful file write response"""
        relative_path = get_relative_path(file_path)
        return ToolResponse(
            success=True,
            display_content=f"Created {relative_path} ({content_length} characters)",
            raw_result=f"File created successfully at {file_path}"
        )