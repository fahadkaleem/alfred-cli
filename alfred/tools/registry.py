"""Simple tool registry for managing available tools."""

import logging

from alfred.tools.base import Tool


class ToolRegistry:
    """Registry for managing tools."""

    def __init__(self):
        """Initialize empty registry."""
        self.tools: dict[str, Tool] = {}
        self.logger = logging.getLogger(__name__)

    def register(self, tool: Tool) -> None:
        """Register a tool instance."""
        if tool.name in self.tools:
            self.logger.warning(f"Tool {tool.name} already registered, overwriting")
        self.tools[tool.name] = tool
        self.logger.info(f"Registered tool: {tool.name}")

    def register_class(self, tool_class: type[Tool]) -> None:
        """Register a tool class by instantiating it."""
        tool = tool_class()
        self.register(tool)

    def get(self, name: str) -> Tool | None:
        """Get tool by name."""
        return self.tools.get(name)

    def list_tools(self) -> list[str]:
        """List all registered tool names."""
        return list(self.tools.keys())

    def get_anthropic_tools(self) -> list[dict]:
        """Get all tools in Anthropic format."""
        return [tool.to_anthropic_format() for tool in self.tools.values()]

    def execute(self, name: str, **kwargs) -> str:
        """Execute a tool by name with given parameters."""
        tool = self.get(name)
        if not tool:
            error_msg = f"Tool '{name}' not found. Available tools: {', '.join(self.list_tools())}"
            self.logger.error(error_msg)
            return error_msg

        self.logger.info(f"Executing tool: {name}")
        return tool.execute(**kwargs)
