import shutil
import subprocess
from typing import Literal

from ..core.tool_definition import ToolDefinition
from ..core.tool_registry import ToolRegistry
from ..core.tool_response import ToolResponse
from ..schemas.grep import GrepInput
from .base_tool import BaseTool


@ToolRegistry.register
class GrepTool(BaseTool):
    """Tool for searching file contents using ripgrep"""

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="Grep",
            description='A powerful search tool built on ripgrep\n\n  Usage:\n  - ALWAYS use Grep for search tasks. NEVER invoke `grep` or `rg` as a Bash command. The Grep tool has been optimized for correct permissions and access.\n  - Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")\n  - Filter files with glob parameter (e.g., "*.js", "**/*.tsx") or type parameter (e.g., "js", "py", "rust")\n  - Output modes: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts\n  - Use Task tool for open-ended searches requiring multiple rounds\n  - Pattern syntax: Uses ripgrep (not grep) - literal braces need escaping (use `interface\\{\\}` to find `interface{}` in Go code)\n  - Multiline matching: By default patterns match within single lines only. For cross-line patterns like `struct \\{[\\s\\S]*?field`, use `multiline: true`',
            input_schema=GrepInput,
            function=self._grep,
        )

    def _grep(
        self,
        pattern: str,
        path: str | None = None,
        glob: str | None = None,
        output_mode: Literal["content", "files_with_matches", "count"] | None = "files_with_matches",
        B: int | None = None,
        A: int | None = None,
        C: int | None = None,
        n: bool | None = None,
        i: bool | None = None,
        type: str | None = None,
        head_limit: int | None = None,
        multiline: bool | None = False,
        **kwargs,
    ) -> ToolResponse:
        """Search for patterns in files using ripgrep"""
        try:
            # Check if ripgrep is available
            if not shutil.which("rg"):
                return ToolResponse(
                    success=False,
                    display_content="ripgrep not installed",
                    raw_result="Error: ripgrep (rg) is not installed. Please install ripgrep to use the Grep tool."
                )

            # Build ripgrep command
            cmd = ["rg"]

            # Add pattern
            cmd.append(pattern)

            # Add path if specified, otherwise use current directory
            if path:
                cmd.append(path)
            else:
                cmd.append(".")

            # Add output mode flags
            if output_mode == "files_with_matches":
                cmd.append("-l")  # files with matches only
            elif output_mode == "count":
                cmd.append("-c")  # count matches per file
            # content mode is default (no special flag needed)

            # Add context options (only for content mode)
            if output_mode == "content":
                if C is not None:
                    cmd.extend(["-C", str(C)])
                else:
                    if B is not None:
                        cmd.extend(["-B", str(B)])
                    if A is not None:
                        cmd.extend(["-A", str(A)])

                # Add line numbers
                if n:
                    cmd.append("-n")

            # Add case insensitive flag
            if i:
                cmd.append("-i")

            # Add file type filter
            if type:
                cmd.extend(["--type", type])

            # Add glob pattern
            if glob:
                cmd.extend(["--glob", glob])

            # Add multiline mode
            if multiline:
                cmd.extend(["-U", "--multiline-dotall"])

            # Add other common ripgrep flags
            cmd.append("--no-heading")  # Don't print file headers
            cmd.append("--color=never")  # No color codes in output

            # Execute ripgrep command
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,  # 30 second timeout
            )

            output = result.stdout

            # Handle empty results
            if not output and result.returncode != 0:
                if result.returncode == 1:
                    return ToolResponse(
                        success=True,
                        display_content="No matches found",
                        raw_result="No matches found"
                    )
                else:
                    error_msg = (
                        result.stderr or f"ripgrep exited with code {result.returncode}"
                    )
                    return ToolResponse(
                        success=False,
                        display_content="Search failed",
                        raw_result=f"Error: {error_msg}"
                    )

            # Apply head limit if specified
            if head_limit and output:
                lines = output.strip().split("\n")
                if len(lines) > head_limit:
                    lines = lines[:head_limit]
                    output = (
                        "\n".join(lines)
                        + f"\n\n[Output limited to first {head_limit} results]"
                    )
                else:
                    output = "\n".join(lines)

            # Return results or indicate no matches
            if not output:
                return ToolResponse(
                    success=True,
                    display_content="No matches found",
                    raw_result="No matches found"
                )

            # Count results for display
            result_lines = output.strip().split("\n")
            num_results = len(result_lines)

            if output_mode == "files_with_matches":
                display = f"Found matches in {num_results} file{'s' if num_results != 1 else ''}"
            elif output_mode == "count":
                display = f"Found matches in {num_results} file{'s' if num_results != 1 else ''}"
            else:
                display = f"Found {num_results} matching line{'s' if num_results != 1 else ''}"

            return ToolResponse(
                success=True,
                display_content=display,
                raw_result=output.strip()
            )

        except subprocess.TimeoutExpired:
            return ToolResponse(
                success=False,
                display_content="Search timed out",
                raw_result="Error: Search timed out (exceeded 30 seconds)"
            )
        except FileNotFoundError:
            return ToolResponse(
                success=False,
                display_content="ripgrep not found",
                raw_result="Error: ripgrep (rg) command not found. Please install ripgrep."
            )
        except Exception as e:
            return ToolResponse(
                success=False,
                display_content="Search error",
                raw_result=f"Error executing grep: {str(e)}"
            )
