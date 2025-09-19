"""File reading tool."""

from pathlib import Path

from alfred.tools.base import Tool


class FileReaderTool(Tool):
    """Tool for reading text file contents."""

    @property
    def name(self) -> str:
        return "read_file"

    @property
    def description(self) -> str:
        return "Read the contents of a text file. Returns first 100 lines by default."

    def execute(self, filepath: str, lines: int = 100) -> str:
        """Read contents of a file.

        Args:
            filepath: Path to the file to read
            lines: Maximum number of lines to read (default 100)

        Returns:
            String containing file contents or error message
        """
        try:
            path = Path(filepath).expanduser().resolve()

            # Basic security check
            if not path.exists():
                return f"File not found: {filepath}"

            if not path.is_file():
                return f"Not a file: {filepath}"

            # Read the file
            with open(path, encoding="utf-8") as f:
                content_lines = f.readlines()[:lines]

            if len(content_lines) == 0:
                return f"File is empty: {filepath}"

            content = "".join(content_lines)
            truncated_msg = (
                f"\n... (showing first {lines} lines)" if len(content_lines) == lines else ""
            )

            return f"Contents of {filepath}:\n{content}{truncated_msg}"

        except PermissionError:
            return f"Permission denied: {filepath}"
        except UnicodeDecodeError:
            return f"Cannot read file (not UTF-8): {filepath}"
        except Exception as e:
            return f"Error reading file: {str(e)}"
