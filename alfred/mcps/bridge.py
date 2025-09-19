"""Bridge between MCP tools and Anthropic tool format."""

from typing import Any

from alfred.mcps.client import MCPClient
from alfred.tools.base import Tool


class MCPToolWrapper(Tool):
    """Wrapper that makes an MCP tool compatible with Anthropic format."""

    def __init__(self, bridge: "MCPBridge", tool_def: Any):
        self.bridge = bridge
        self.tool_def = tool_def
        # Tool is a Pydantic model with attributes
        self._name = tool_def.name
        self._description = tool_def.description or ""

    @property
    def name(self) -> str:
        return self._name

    @property
    def description(self) -> str:
        return self._description

    def execute(self, **kwargs) -> str:
        """Execute the MCP tool and return result as string."""
        # Use original name for execution
        original_name = getattr(self, '_original_name', self._name)
        result = self.bridge.call_tool(original_name, kwargs)

        # Handle different result types
        if hasattr(result, 'content'):
            # MCP returns content in result.content
            if isinstance(result.content, list):
                # Multiple content blocks
                return "\n".join(str(item.text if hasattr(item, 'text') else item) for item in result.content)
            return str(result.content)
        return str(result)

    def to_anthropic_format(self) -> dict[str, Any]:
        """Convert MCP tool definition to Anthropic format."""
        # MCP tools already have inputSchema that matches Anthropic's input_schema
        return {
            "name": self._name,
            "description": self._description,
            "input_schema": self.tool_def.inputSchema or {
                "type": "object",
                "properties": {},
                "required": []
            }
        }


class MCPBridge:
    """Bridge that manages MCP server connection and tool access."""

    def __init__(self, name: str, command: str, args: list[str] = None, env: dict[str, str] = None):
        self.name = name
        self.client = MCPClient(command, args, env)
        self.tools = []

    def __enter__(self):
        """Start MCP server and load tools."""
        # Start the persistent MCP server connection
        self.client.start()

        # Get the initial list of tools
        mcp_tools = self.client.list_tools()

        # Wrap each MCP tool
        for tool_def in mcp_tools:
            wrapped = MCPToolWrapper(self, tool_def)
            # Add server name prefix to avoid conflicts
            wrapped._original_name = wrapped._name
            wrapped._name = f"{self.name}_{wrapped._name}"
            self.tools.append(wrapped)

        return self

    def __exit__(self, *args):
        """Stop the MCP server."""
        self.client.stop()

    def call_tool(self, name: str, arguments: dict[str, Any]) -> Any:
        """Execute a tool on the MCP server."""
        # Remove server prefix if present
        if "_" in name and name.startswith(f"{self.name}_"):
            name = name.replace(f"{self.name}_", "", 1)
        return self.client.call_tool(name, arguments)

    def get_tools(self) -> list[Tool]:
        """Get all wrapped tools."""
        return self.tools