import subprocess
from pathlib import Path

from ..core.configuration import ConfigurationManager
from ..core.messages import ErrorMessages, SuccessMessages
from ..core.tool_definition import ToolDefinition
from ..core.tool_registry import ToolRegistry
from ..schemas.bash import BashInput
from .base_tool import BaseTool


@ToolRegistry.register
class BashTool(BaseTool):
    """Tool for executing bash commands with Claude Code's exact behavior"""

    def __init__(self):
        # Maintain persistent shell session state
        self.current_directory = Path.cwd()
        self.config = ConfigurationManager()

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="Bash",
            description='Executes a given bash command in a persistent shell session with optional timeout, ensuring proper handling and security measures.\n\nBefore executing the command, please follow these steps:\n\n1. Directory Verification:\n   - If the command will create new directories or files, first verify the parent directory exists and is the correct location\n   - For example, before running "mkdir foo/bar", first check that "foo" exists and is the intended parent directory\n\n2. Command Execution:\n   - Always quote file paths that contain spaces with double quotes (e.g., cd "path with spaces/file.txt")\n   - Examples of proper quoting:\n     - cd "/Users/name/My Documents" (correct)\n     - cd /Users/name/My Documents (incorrect - will fail)\n     - python "/path/with spaces/script.py" (correct)\n     - python /path/with spaces/script.py (incorrect - will fail)\n   - After ensuring proper quoting, execute the command.\n   - Capture the output of the command.\n\nUsage notes:\n  - The command argument is required.\n  - You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes). If not specified, commands will timeout after 120000ms (2 minutes).\n  - It is very helpful if you write a clear, concise description of what this command does in 5-10 words.\n  - If the output exceeds 30000 characters, output will be truncated before being returned to you.\n  - VERY IMPORTANT: You MUST avoid using search commands like `find` and `grep`. Instead use Grep, Glob, or Task to search. You MUST avoid read tools like `cat`, `head`, and `tail`, and use Read to read files.\n - If you _still_ need to run `grep`, STOP. ALWAYS USE ripgrep at `rg` first, which all Claude Code users have pre-installed.\n  - When issuing multiple commands, use the \';\' or \'&&\' operator to separate them. DO NOT use newlines (newlines are ok in quoted strings).\n  - Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of `cd`. You may use `cd` if the User explicitly requests it.',
            input_schema=BashInput,
            function=self._bash,
        )

    def _bash(
        self,
        command: str,
        timeout: int | None = None,
        description: str | None = None,
    ) -> str:
        """Execute bash command with Claude Code's exact behavior"""
        try:
            # Get timeout from configuration
            timeout_seconds = self.config.get_timeout_seconds(timeout)

            # Security check - warn about discouraged commands
            command_words = command.split()
            if command_words and command_words[0] in self.config.discouraged_commands:
                return f"Warning: Consider using Claude Code tools instead of '{command_words[0]}'. Use Read instead of 'cat/head/tail', Grep instead of 'grep', Glob instead of 'find'."

            # Execute command with timeout
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                cwd=self.current_directory,
            )

            # Combine stdout and stderr
            output = ""
            if result.stdout:
                output += result.stdout
            if result.stderr:
                if output:
                    output += "\n" + result.stderr
                else:
                    output = result.stderr

            # Handle cd command to maintain persistent session
            if command.strip().startswith("cd "):
                # Extract directory from cd command (basic parsing)
                cd_parts = command.strip().split(maxsplit=1)
                if len(cd_parts) > 1:
                    new_dir = cd_parts[1].strip("\"'")
                    try:
                        if new_dir.startswith("/"):
                            # Absolute path
                            self.current_directory = Path(new_dir).resolve()
                        else:
                            # Relative path
                            self.current_directory = (
                                self.current_directory / new_dir
                            ).resolve()
                    except Exception:
                        pass  # Keep current directory if cd fails

            # Truncate output if too long
            if len(output) > self.config.max_output_length:
                output = (
                    output[:self.config.max_output_length]
                    + f"\n\n[Output truncated - exceeded {self.config.max_output_length} character limit]"
                )

            # Return empty output as success message if command succeeded but no output
            if not output and result.returncode == 0:
                output = SuccessMessages.NO_OUTPUT
            elif not output and result.returncode != 0:
                output = f"{ErrorMessages.COMMAND_FAILED} {result.returncode} (no output)"

            return output

        except subprocess.TimeoutExpired:
            return f"{ErrorMessages.COMMAND_TIMEOUT} after {timeout_seconds} seconds"
        except Exception as e:
            return f"Error executing command: {str(e)}"
