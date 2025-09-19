"""MCP Client for stdio-based communication with MCP servers."""

import asyncio
import os
import sys
from typing import Any

from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters


class MCPClient:
    """MCP client that keeps a persistent connection to the server."""

    def __init__(self, command: str, args: list[str] = None, env: dict[str, str] = None):
        self.command = command
        self.args = args or []
        self.env = env or {}
        self.session = None
        self.stdio = None
        self.write = None
        self._context = None
        self._loop = None

    def start(self):
        """Start the MCP server and establish connection."""
        # Create event loop for the entire session
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)

        # Start the server and keep connection open
        self._loop.run_until_complete(self._connect())

    def stop(self):
        """Stop the MCP server and clean up."""
        # Simply close the loop - the server process will be terminated
        if self._loop:
            try:
                # Don't try to disconnect cleanly - just close the loop
                # The subprocess will be terminated when the context exits
                self._loop.close()
            except:
                pass  # Ignore errors during shutdown

    async def _connect(self):
        """Connect to MCP server."""
        # Set up environment
        env = os.environ.copy()
        env['PYTHONUNBUFFERED'] = '1'
        # Suppress debug output
        env['FASTMCP_SUPPRESS_BANNER'] = '1'
        env['LOG_LEVEL'] = 'ERROR'
        # Add any server-specific environment variables
        env.update(self.env)

        server_params = StdioServerParameters(
            command=self.command,
            args=self.args,
            env=env
        )

        # Start the server process and keep it running
        from mcp.client.stdio import stdio_client
        self._context = stdio_client(server_params)
        self.stdio, self.write = await self._context.__aenter__()

        # Create and initialize session
        self.session = ClientSession(self.stdio, self.write)
        await self.session.__aenter__()
        await self.session.initialize()

    def list_tools(self) -> list[dict[str, Any]]:
        """List available tools."""
        if not self._loop or not self.session:
            raise RuntimeError("Client not started")
        return self._loop.run_until_complete(self._list_tools_async())

    def call_tool(self, name: str, arguments: dict[str, Any]) -> Any:
        """Call a tool."""
        if not self._loop or not self.session:
            raise RuntimeError("Client not started")
        return self._loop.run_until_complete(self._call_tool_async(name, arguments))

    async def _list_tools_async(self) -> list[dict[str, Any]]:
        """Async implementation of list_tools."""
        response = await self.session.list_tools()
        return response.tools or []

    async def _call_tool_async(self, name: str, arguments: dict[str, Any]) -> Any:
        """Async implementation of call_tool."""
        return await self.session.call_tool(name, arguments)