#!/usr/bin/env python
"""Main entry point for Alfred CLI."""

import logging
import sys

from alfred.agent import AnthropicAgent
from alfred.cli.chat import ChatInterface
from alfred.config import get_settings
from alfred.context import ConversationContext
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


def setup_tools() -> ToolRegistry:
    """Initialize and register available tools."""
    registry = ToolRegistry()

    # Register built-in tools
    registry.register(CalculatorTool())
    registry.register(FileReaderTool())
    registry.register(TimeTool())

    return registry


def main():
    """Alfred CLI - AI Chat Assistant with Tools.

    All configuration is done via:
    1. .env file for defaults
    2. In-app commands for runtime changes
    """
    # Set up logging
    setup_logging()

    try:
        # Load settings from .env
        settings = get_settings()

        # Initialize components
        context = ConversationContext()
        tool_registry = setup_tools()
        agent = AnthropicAgent(settings, tool_registry)

        # Create and run chat interface
        chat = ChatInterface(agent, context)
        chat.run()

    except KeyboardInterrupt:
        print("\nExiting...")
        sys.exit(0)
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        print(f"\nError: {e}")
        print("Please check your .env file and API key.")
        sys.exit(1)


if __name__ == "__main__":
    main()
