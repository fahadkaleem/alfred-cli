"""Configuration management for the Claude Code agent"""
import os
import sys
from pathlib import Path

from rich.console import Console

console = Console()


class ConfigurationManager:
    """Centralized configuration and settings management"""

    def __init__(self):
        """Initialize configuration with all settings"""
        # API Configuration
        self.api_key = self._load_api_key()

        # Model Configuration
        self.model_name = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")
        self.max_tokens = self._get_int_env("CLAUDE_MAX_TOKENS", 4096)
        self.tool_choice = {"type": "auto"}

        # Timeout Configuration (in milliseconds)
        self.default_timeout_ms = self._get_int_env("CLAUDE_DEFAULT_TIMEOUT_MS", 120000)
        self.max_timeout_ms = self._get_int_env("CLAUDE_MAX_TIMEOUT_MS", 600000)

        # File Limits
        self.max_file_lines = self._get_int_env("CLAUDE_MAX_FILE_LINES", 2000)
        self.max_line_length = self._get_int_env("CLAUDE_MAX_LINE_LENGTH", 2000)
        self.max_output_length = self._get_int_env("CLAUDE_MAX_OUTPUT_LENGTH", 30000)

        # System Configuration
        self.working_directory = os.getcwd()
        self.system_prompt = self._load_system_prompt()

        # Discouraged bash commands (should use Claude Code tools instead)
        self.discouraged_commands = ["find", "grep", "cat", "head", "tail"]

        # Validate configuration
        self._validate_configuration()

    def _get_int_env(self, key: str, default: int) -> int:
        """Get integer value from environment variable with default"""
        value = os.getenv(key)
        if value is None:
            return default
        try:
            return int(value)
        except ValueError:
            console.print(f"[yellow]Warning: Invalid integer value for {key}: {value}, using default: {default}[/yellow]")
            return default

    def _validate_configuration(self):
        """Validate configuration values are within acceptable ranges"""
        # Validate max_tokens
        if self.max_tokens < 100 or self.max_tokens > 8192:
            raise ValueError(f"max_tokens must be between 100 and 8192, got {self.max_tokens}")

        # Validate timeouts
        if self.default_timeout_ms < 1000:  # Less than 1 second
            raise ValueError(f"default_timeout_ms must be at least 1000ms, got {self.default_timeout_ms}")
        if self.max_timeout_ms < self.default_timeout_ms:
            raise ValueError("max_timeout_ms must be >= default_timeout_ms")
        if self.max_timeout_ms > 3600000:  # More than 1 hour
            raise ValueError(f"max_timeout_ms cannot exceed 3600000ms (1 hour), got {self.max_timeout_ms}")

        # Validate file limits
        if self.max_file_lines < 10:
            raise ValueError(f"max_file_lines must be at least 10, got {self.max_file_lines}")
        if self.max_line_length < 100:
            raise ValueError(f"max_line_length must be at least 100, got {self.max_line_length}")
        if self.max_output_length < 1000:
            raise ValueError(f"max_output_length must be at least 1000, got {self.max_output_length}")

    def _load_api_key(self) -> str:
        """Load API key from environment or prompt user"""
        api_key = os.getenv("ANTHROPIC_API_KEY")

        if not api_key:
            console.print("[yellow]Enter your Anthropic API key:[/yellow] ", end="")
            api_key = input()

            if not api_key.strip():
                console.print("[red]Error: API key cannot be empty[/red]")
                sys.exit(1)

            # Set for current session
            os.environ["ANTHROPIC_API_KEY"] = api_key
            console.print()

        return api_key

    def _load_system_prompt(self) -> str:
        """Load system prompt from markdown file"""
        try:
            # Get the project root directory
            project_root = Path(__file__).parent.parent.parent
            system_prompt_path = project_root / "prompts" / "system_prompt.md"

            if system_prompt_path.exists():
                with open(system_prompt_path, encoding="utf-8") as f:
                    base_prompt = f.read().strip()
            else:
                console.print(
                    f"[yellow]Warning: System prompt not found at {system_prompt_path}[/yellow]"
                )
                base_prompt = ""

            # Add working directory context
            working_dir_info = (
                f"\n\nWORKING DIRECTORY CONTEXT:\n"
                f"Your current working directory is: {self.working_directory}\n"
                f"When creating file paths, always use absolute paths starting with "
                f"{self.working_directory}/ for files in the current project.\n"
            )

            return base_prompt + working_dir_info if base_prompt else working_dir_info

        except Exception as e:
            console.print(f"[red]Error loading system prompt: {str(e)}[/red]")
            return ""

    def get_api_params(self) -> dict:
        """Get parameters for API calls"""
        return {
            "model": self.model_name,
            "max_tokens": self.max_tokens,
            "tool_choice": self.tool_choice
        }

    def get_timeout_seconds(self, timeout_ms: int | None = None) -> float:
        """Convert timeout from milliseconds to seconds with validation"""
        if timeout_ms is None:
            timeout_ms = self.default_timeout_ms

        # Enforce maximum timeout
        timeout_ms = min(timeout_ms, self.max_timeout_ms)

        return timeout_ms / 1000.0
