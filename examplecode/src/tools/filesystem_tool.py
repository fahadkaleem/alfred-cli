from pathlib import Path
from abc import abstractmethod
from src.tools.base_tool import BaseTool
from src.core.tool_response import ToolResponse
from src.core.messages import ErrorMessages, SuccessMessages
from src.utils.path_utils import get_relative_path
from src.utils.path_validator import PathValidator


class FileSystemTool(BaseTool):
    """Base class for tools that work with the filesystem"""
    
    def _validate_file_exists(self, file_path: str) -> tuple[bool, Path, str]:
        """
        Validate that a file exists and return path object.
        Returns: (exists, Path object, relative_path)
        """
        is_valid, file_path_obj, error_msg = PathValidator.validate_file_exists(file_path)
        relative_path = get_relative_path(file_path)
        return is_valid, file_path_obj, relative_path
    
    def _check_file_empty(self, file_path_obj: Path) -> bool:
        """Check if a file is empty"""
        return PathValidator.is_file_empty(file_path_obj)
    
    def _read_file_content(self, file_path_obj: Path) -> str:
        """Read and return file content"""
        with open(file_path_obj, "r", encoding="utf-8") as f:
            return f.read()
    
    def _read_file_lines(self, file_path_obj: Path) -> list[str]:
        """Read and return file lines"""
        with open(file_path_obj, "r", encoding="utf-8") as f:
            return f.readlines()
    
    def _write_file_content(self, file_path_obj: Path, content: str) -> None:
        """Write content to file"""
        with open(file_path_obj, "w", encoding="utf-8") as f:
            f.write(content)