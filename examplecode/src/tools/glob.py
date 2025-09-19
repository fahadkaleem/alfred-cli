import glob
import os

from ..core.tool_definition import ToolDefinition
from ..core.tool_registry import ToolRegistry
from ..schemas.glob import GlobInput
from .base_tool import BaseTool


@ToolRegistry.register
class GlobTool(BaseTool):
    """Fast file pattern matching tool that works with any codebase size"""

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="Glob",
            description='- Fast file pattern matching tool that works with any codebase size\n- Supports glob patterns like "**/*.js" or "src/**/*.ts"\n- Returns matching file paths sorted by modification time\n- Use this tool when you need to find files by name patterns\n- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Agent tool instead\n- You have the capability to call multiple tools in a single response. It is always better to speculatively perform multiple searches as a batch that are potentially useful.',
            input_schema=GlobInput,
            function=self._glob,
        )

    def _glob(self, pattern: str, path: str | None = None) -> str:
        """Find files matching glob patterns, sorted by modification time"""
        try:
            # Determine search directory
            if path is None:
                search_dir = os.getcwd()
            else:
                search_dir = path
                if not os.path.exists(search_dir):
                    return f"Error: Directory {path} does not exist"
                if not os.path.isdir(search_dir):
                    return f"Error: {path} is not a directory"

            # Change to search directory for globbing
            original_cwd = os.getcwd()
            try:
                os.chdir(search_dir)

                # Perform glob search with recursive support
                matches = glob.glob(pattern, recursive=True)

                if not matches:
                    return (
                        f"No files found matching pattern '{pattern}' in {search_dir}"
                    )

                # Get full paths and modification times
                file_info = []
                for match in matches:
                    full_path = os.path.abspath(match)
                    try:
                        mtime = os.path.getmtime(full_path)
                        file_info.append((full_path, mtime))
                    except OSError:
                        # File might have been deleted or inaccessible
                        continue

                # Sort by modification time (newest first)
                file_info.sort(key=lambda x: x[1], reverse=True)

                # Extract just the paths
                sorted_paths = [info[0] for info in file_info]

                # Format output
                result_lines = []
                result_lines.append(
                    f"Found {len(sorted_paths)} files matching '{pattern}':"
                )
                for path_item in sorted_paths:
                    # Show relative path if it's within search directory for cleaner output
                    try:
                        rel_path = os.path.relpath(path_item, search_dir)
                        if not rel_path.startswith(".."):
                            result_lines.append(f"  {rel_path}")
                        else:
                            result_lines.append(f"  {path_item}")
                    except ValueError:
                        # On Windows, relpath can fail if paths are on different drives
                        result_lines.append(f"  {path_item}")

                return "\n".join(result_lines)

            finally:
                # Restore original working directory
                os.chdir(original_cwd)

        except Exception as e:
            return f"Error during glob search: {str(e)}"
