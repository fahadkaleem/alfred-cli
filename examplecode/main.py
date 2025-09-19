#!/usr/bin/env python3
"""
Claude Code - A Python implementation of an AI code editing agent
Based on the tutorial from ampcode.com/how-to-build-an-agent
"""

from dotenv import load_dotenv
from rich.console import Console
from src.core.agent import Agent

# Load environment variables from .env file
load_dotenv()

console = Console()


def main():
    """Main entry point for the agent"""
    # Simple startup message
    console.print("[bold cyan]Claude Code[/bold cyan]")
    console.print("[dim]Type 'exit' to quit[/dim]\n")

    # Initialize agent (ConfigurationManager handles API key)
    agent = Agent()

    # Main conversation loop
    while True:
        try:
            # Get user input with simple prompt at bottom
            console.print("[cyan]>[/cyan] ", end="")
            user_input = input()

            # Check for exit commands
            if user_input.lower() in ["exit", "quit", "bye"]:
                break

            # Process the message
            agent.chat(user_input)

        except KeyboardInterrupt:
            break
        except Exception as e:
            console.print(f"[red]Error: {str(e)}[/red]")
            continue


if __name__ == "__main__":
    main()
