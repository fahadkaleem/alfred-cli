"""Configuration management using Pydantic Settings."""

import json
from pathlib import Path
from typing import Any

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class MCPServerConfig(BaseSettings):
    """Configuration for a single MCP server."""

    command: str
    args: list[str] = []
    env: dict[str, str] = {}
    disabled: bool = False


class Settings(BaseSettings):
    """Configuration settings for Alfred CLI."""

    # API Configuration - only what's essential
    anthropic_api_key: str = Field(..., alias="ANTHROPIC_API_KEY")
    model: str = Field(default="claude-3-5-haiku-20241022", alias="ALFRED_MODEL")

    # Sensible defaults that don't need configuration
    max_tokens: int = 4096
    temperature: float = 0.7
    stream_responses: bool = True

    # MCP Server Configuration
    # JSON config file for multiple MCP servers
    mcp_config_file: str = Field(default="mcp.json", alias="ALFRED_MCP_CONFIG")
    # Defaults to mcp.json in project root, can override with ALFRED_MCP_CONFIG env var

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    def get_mcp_servers(self) -> dict[str, MCPServerConfig]:
        """Get all MCP server configurations."""
        servers = {}

        # Load servers from JSON config
        if self.mcp_config_file:
            config_path = Path(self.mcp_config_file).expanduser()
            if config_path.exists():
                with open(config_path) as f:
                    config = json.load(f)

                if "mcpServers" in config:
                    for name, server_config in config["mcpServers"].items():
                        if not server_config.get("disabled", False):
                            servers[name] = MCPServerConfig(**server_config)

        return servers

    def validate_api_key(self) -> bool:
        """Check if API key looks valid."""
        return bool(self.anthropic_api_key and self.anthropic_api_key.startswith("sk-"))


def get_settings() -> Settings:
    """Get settings instance."""
    return Settings()
