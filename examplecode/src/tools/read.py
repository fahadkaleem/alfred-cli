
from src.core.configuration import ConfigurationManager
from src.core.messages import ErrorMessages
from src.core.tool_definition import ToolDefinition
from src.core.tool_registry import ToolRegistry
from src.core.tool_response import ToolResponse
from src.schemas.read_file import ReadFileInput
from src.tools.filesystem_tool import FileSystemTool


@ToolRegistry.register
class ReadTool(FileSystemTool):
    """Tool for reading file contents"""

    def __init__(self):
        self.config = ConfigurationManager()

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="Read",
            description="Reads a file from the local filesystem. You can access any file directly by using this tool.\nAssume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.\n\nUsage:\n- The file_path parameter must be an absolute path, not a relative path\n- By default, it reads up to 2000 lines starting from the beginning of the file\n- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters\n- Any lines longer than 2000 characters will be truncated\n- Results are returned using cat -n format, with line numbers starting at 1\n- This tool allows Claude Code to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as Claude Code is a multimodal LLM.\n- This tool can read PDF files (.pdf). PDFs are processed page by page, extracting both text and visual content for analysis.\n- This tool can read Jupyter notebooks (.ipynb files) and returns all cells with their outputs, combining code, text, and visualizations.\n- You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful.\n- You will regularly be asked to read screenshots. If the user provides a path to a screenshot ALWAYS use this tool to view the file at the path. This tool will work with all temporary file paths like /var/folders/123/abc/T/TemporaryItems/NSIRD_screencaptureui_ZfB1tD/Screenshot.png\n- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.",
            input_schema=ReadFileInput,
            function=self._read_file,
        )

    def _read_file(
        self, file_path: str, offset: int | None = None, limit: int | None = None
    ) -> ToolResponse:
        """Read contents of a file with cat -n format"""

        try:
            # Use base class method for validation
            exists, file_path_obj, relative_path = self._validate_file_exists(file_path)
            if not exists:
                return self._create_error_response(ErrorMessages.FILE_NOT_FOUND)

            # Check if file is empty using base class method
            if self._check_file_empty(file_path_obj):
                return self._create_success_response(
                    display_content="File is empty",
                    raw_result=f"Warning: {ErrorMessages.FILE_EMPTY}"
                )

            # Use base class method to read lines
            lines = self._read_file_lines(file_path_obj)

            # Apply offset and limit
            start_line = (offset - 1) if offset else 0
            end_line = start_line + limit if limit else min(len(lines), self.config.max_file_lines)

            # Ensure we don't exceed max lines total
            if end_line - start_line > self.config.max_file_lines:
                end_line = start_line + self.config.max_file_lines

            selected_lines = lines[start_line:end_line]

            # Format with line numbers (cat -n format)
            formatted_lines = []
            for i, line in enumerate(selected_lines, start=start_line + 1):
                # Truncate lines longer than max length
                if len(line) > self.config.max_line_length:
                    line = line[:self.config.max_line_length] + "...[truncated]"
                # Remove trailing newline for formatting, add it back with line number
                line = line.rstrip("\n")
                formatted_lines.append(f"     {i}→{line}")

            raw_result = "\n".join(formatted_lines)

            # Create display content
            line_count = len(selected_lines)
            display_content = f"Read {line_count} lines"

            return self._create_success_response(
                display_content=display_content,
                raw_result=raw_result
            )

        except Exception as e:
            return self._create_error_response(f"{ErrorMessages.READ_ERROR}: {str(e)}")
