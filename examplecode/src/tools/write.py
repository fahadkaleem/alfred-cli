from pathlib import Path
import os
from src.tools.filesystem_tool import FileSystemTool
from src.core.tool_definition import ToolDefinition
from src.core.tool_response import ToolResponse
from src.core.tool_registry import ToolRegistry
from src.core.messages import ErrorMessages, SuccessMessages
from src.schemas.write_file import WriteFileInput
from src.utils.path_utils import get_relative_path
from src.utils.path_validator import PathValidator


@ToolRegistry.register
class WriteTool(FileSystemTool):
    """Tool for writing files to the local filesystem"""

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="Write",
            description="Writes a file to the local filesystem.\n\nUsage:\n- This tool will overwrite the existing file if there is one at the provided path.\n- If this is an existing file, you MUST use the Read tool first to read the file's contents. This tool will fail if you did not read the file first.\n- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.\n- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.\n- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.",
            input_schema=WriteFileInput,
            function=self._write_file,
        )

    def _write_file(self, file_path: str, content: str) -> ToolResponse:
        """Write content to a file"""
        
        try:
            file_path_obj = Path(file_path)
            relative_path = get_relative_path(file_path)

            # Validate path is absolute to prevent hallucinated paths
            if not file_path_obj.is_absolute():
                return self._create_error_response(ErrorMessages.INVALID_PATH)

            # Get current working directory for validation
            current_dir = Path(os.getcwd())

            # Check if the path is within the current working directory tree
            try:
                file_path_obj.relative_to(current_dir)
            except ValueError:
                return self._create_error_response(ErrorMessages.INVALID_PATH)

            # Create parent directories if needed
            file_path_obj.parent.mkdir(parents=True, exist_ok=True)

            # Check if file exists before writing
            file_existed = file_path_obj.exists()
            
            # Write the content using base class method
            self._write_file_content(file_path_obj, content)

            # Count lines in content
            lines = content.split('\n')
            line_count = len(lines)
            
            # Create display content with preview
            action = "Overwrote" if file_existed else "Wrote"
            display_parts = [f"{action} {line_count} lines to {relative_path}"]
            
            # Add preview of first 6 lines
            preview_lines = lines[:6]
            for line in preview_lines:
                # Truncate long lines for display
                if len(line) > 80:
                    line = line[:80] + "..."
                display_parts.append(f"     {line}")
            
            # Add remaining lines indicator if there are more
            if line_count > 6:
                remaining = line_count - 6
                display_parts.append(f"     … +{remaining} lines")
            
            display_content = '\n'.join(display_parts)
            
            action_word = "Overwrote" if file_existed else "Created"
            return self._create_success_response(
                display_content=display_content,
                raw_result=f"{action_word} file: {file_path}"
            )

        except Exception as e:
            return self._create_error_response(f"{ErrorMessages.WRITE_ERROR}: {str(e)}")
