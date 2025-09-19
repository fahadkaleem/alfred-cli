#!/usr/bin/env python
"""Main entry point for Alfred CLI."""

import logging
import sys

from alfred.agent import AnthropicAgent
from alfred.cli.chat import ChatInterface
from alfred.config import get_settings
from alfred.context import ConversationContext
from alfred.mcps.bridge import MCPBridge
from alfred.tools.calculator import CalculatorTool
from alfred.tools.file_reader import FileReaderTool
from alfred.tools.get_time import TimeTool
from alfred.tools.registry import ToolRegistry


def setup_logging() -> None:
    """Configure logging."""
    # Disable most logging to keep the interface clean
    logging.basicConfig(
        level=logging.ERROR,  # Only show errors
        format="%(message)s",  # Simple format
    )


def setup_tools(settings) -> tuple[ToolRegistry, list[MCPBridge]]:
    """Initialize and register available tools."""
    registry = ToolRegistry()
    mcp_bridges = []

    # Register built-in tools
    registry.register(CalculatorTool())
    registry.register(FileReaderTool())
    registry.register(TimeTool())

    # Get all MCP server configurations
    mcp_servers = settings.get_mcp_servers()

    # Start each MCP server and register its tools
    for server_name, server_config in mcp_servers.items():
        try:
            bridge = MCPBridge(
                name=server_name,
                command=server_config.command,
                args=server_config.args,
                env=server_config.env
            )
            bridge.__enter__()  # Start the MCP server

            # Register all tools from this server
            for tool in bridge.get_tools():
                registry.register(tool)

            mcp_bridges.append(bridge)

        except Exception as e:
            print(f"Warning: Failed to load MCP server '{server_name}': {e}")
            # Continue without this server's tools

    return registry, mcp_bridges


def main():
    """Alfred CLI - AI Chat Assistant with Tools.

    All configuration is done via:
    1. .env file for defaults
    2. mcp.json for MCP server configurations
    3. In-app commands for runtime changes
    """
    # Set up logging
    setup_logging()

    mcp_bridges = []
    try:
        # Load settings from .env
        settings = get_settings()

        # Initialize components
        context = ConversationContext()
        tool_registry, mcp_bridges = setup_tools(settings)
        agent = AnthropicAgent(settings, tool_registry)

        # Create and run chat interface
        chat = ChatInterface(agent, context)
        chat.run()

    except KeyboardInterrupt:
        print("\nExiting...")
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        print(f"\nError: {e}")
        print("Please check your .env file and API key.")
    finally:
        # Clean up all MCP bridges
        for bridge in mcp_bridges:
            try:
                bridge.__exit__(None, None, None)
            except:
                pass  # Ignore errors during cleanup
        sys.exit(0)


if __name__ == "__main__":
    main()
