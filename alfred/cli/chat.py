"""Chat interface for Alfred CLI."""

import pyperclip
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.text import Text

from alfred.agent import AnthropicAgent
from alfred.cli.spinner import LoadingSpinner
from alfred.context import ConversationContext, MessageRole


class ChatInterface:
    """Chat interface for Alfred CLI."""

    def __init__(self, agent: AnthropicAgent, context: ConversationContext):
        """Initialize chat interface."""
        self.agent = agent
        self.context = context
        self.console = Console()
        self.enabled_tools = set(agent.tool_registry.list_tools()) if agent.tool_registry else set()

    def run(self) -> None:
        """Main chat loop."""
        # Clear screen and show welcome
        self.console.clear()
        self.console.print(
            Panel(
                Text(
                    "Welcome to Alfred CLI! Type '/help' for commands, '/exit' to quit.",
                    style="green",
                ),
                title="🤖 Alfred CLI",
                border_style="cyan",
            )
        )

        # Skip connection validation - it will fail with a clear error on first message anyway

        # Main loop
        try:
            while True:
                # Get input with a styled prompt (like your old code)
                try:
                    self.console.print("\n[cyan]>[/cyan] ", end="")
                    user_input = input()
                except (EOFError, KeyboardInterrupt):
                    break

                if not user_input.strip():
                    continue

                # Handle special keywords
                if user_input.lower() in ["exit", "quit", "bye"]:
                    break

                # Handle commands
                if user_input.startswith("/"):
                    if self._handle_command(user_input):
                        continue

                # Process with agent
                self._handle_agent_response(user_input)

        except KeyboardInterrupt:
            pass

        self.console.print("\n👋 Goodbye!\n")

    def _handle_agent_response(self, message: str) -> None:
        """Handle response from agent with tool calling loop."""
        try:
            # Add user message to context
            self.context.add_message(MessageRole.USER, message)

            # Get enabled tools
            enabled_tools = self._get_enabled_tools()

            while True:
                # Get response from API
                spinner = LoadingSpinner("Assistant is typing...")
                spinner.start()

                try:
                    response = self.agent.client.messages.create(
                        model=self.agent.settings.model,
                        max_tokens=self.agent.settings.max_tokens,
                        temperature=self.agent.settings.temperature,
                        messages=self.context.get_messages(),
                        tools=enabled_tools,
                    )
                finally:
                    spinner.stop()

                # Process response
                text_content = ""
                tool_calls = []
                content_list = []

                for content_block in response.content:
                    if content_block.type == "text":
                        text_content += content_block.text
                        content_list.append({"type": "text", "text": content_block.text})
                    elif content_block.type == "tool_use":
                        tool_calls.append(content_block)
                        content_list.append(
                            {
                                "type": "tool_use",
                                "id": content_block.id,
                                "name": content_block.name,
                                "input": content_block.input,
                            }
                        )

                # Add assistant response to context (only if there's content)
                if content_list:
                    self.context.add_message(MessageRole.ASSISTANT, content_list)

                # Display text if any
                if text_content:
                    self._display_assistant_message(text_content)

                # If no tool calls, we're done
                if not tool_calls:
                    break

                # Execute tools and add results
                tool_results = []
                for tool_call in tool_calls:
                    # Show tool execution
                    self.console.print(
                        Panel(
                            f"[Tool: {tool_call.name}]\nInput: {tool_call.input}",
                            title="🔧 Tool Execution",
                            border_style="yellow",
                        )
                    )

                    # Execute tool
                    result = self.agent.tool_registry.execute(tool_call.name, **tool_call.input)

                    # Show result
                    self.console.print(Panel(result, title="Tool Result", border_style="blue"))

                    # Format for API
                    tool_results.append(
                        {"type": "tool_result", "tool_use_id": tool_call.id, "content": result}
                    )

                # Add tool results to context
                self.context.add_message(MessageRole.USER, tool_results)
                # Continue loop

        except Exception as e:
            self.console.print(Panel(f"Error: {str(e)}", border_style="red"))

    def _get_enabled_tools(self):
        """Get list of enabled tools in Anthropic format."""
        if not self.agent.tool_registry:
            return None

        return [
            tool.to_anthropic_format()
            for name, tool in self.agent.tool_registry.tools.items()
            if name in self.enabled_tools
        ]

    def _display_assistant_message(self, content: str):
        """Display assistant message with proper formatting."""
        if not content:
            return

        if "```" in content:
            # Has code blocks - use markdown
            self.console.print(Panel(Markdown(content), title="Assistant", border_style="green"))
        else:
            # Plain text
            self.console.print(Panel(content.strip(), title="Assistant", border_style="green"))

    def _handle_command(self, command: str) -> bool:
        """Handle slash commands."""
        cmd = command.lower().strip()

        if cmd == "/help":
            help_text = """
[bold]Available Commands:[/bold]
  /help    - Show this help message
  /clear   - Clear screen and conversation
  /reset   - Reset conversation (keep settings)
  /tools   - List available tools
  /tool    - Enable/disable a tool (e.g., /tool disable calculator)
  /retry   - Retry last response
  /undo    - Remove last exchange
  /copy    - Copy last response to clipboard
  /exit    - Exit the application

[bold]Tips:[/bold]
  • Press Ctrl+C to cancel current input
  • Press Ctrl+D or type /exit to quit
            """
            self.console.print(Panel(help_text, title="Help", border_style="cyan"))
            return True

        elif cmd == "/clear":
            self.context.clear()
            self.console.clear()
            self.console.print("🔄 Conversation cleared.\n")
            return True

        elif cmd == "/reset":
            # Keep last few system messages if any, clear the rest
            self.context.clear()
            self.console.print("🔄 Conversation reset.\n")
            return True

        elif cmd in ["/exit", "/quit"]:
            raise KeyboardInterrupt

        elif cmd == "/tools":
            if not self.agent.tool_registry:
                self.console.print("No tools available.")
            else:
                all_tools = self.agent.tool_registry.list_tools()
                tools_text = []
                for tool in all_tools:
                    status = "✅" if tool in self.enabled_tools else "❌"
                    tools_text.append(f"  {status} {tool}")
                self.console.print(
                    Panel("\n".join(tools_text), title="Available Tools", border_style="blue")
                )
            return True

        elif cmd.startswith("/tool"):
            parts = command.split()
            if len(parts) < 3:
                self.console.print("Usage: /tool [enable|disable] [tool_name]")
                return True

            action = parts[1].lower()
            tool_name = parts[2].lower()

            if (
                not self.agent.tool_registry
                or tool_name not in self.agent.tool_registry.list_tools()
            ):
                self.console.print(f"Tool '{tool_name}' not found.")
                return True

            if action == "enable":
                self.enabled_tools.add(tool_name)
                self.console.print(f"✅ Tool '{tool_name}' enabled.")
            elif action == "disable":
                self.enabled_tools.discard(tool_name)
                self.console.print(f"❌ Tool '{tool_name}' disabled.")
            else:
                self.console.print(f"Unknown action: {action}. Use 'enable' or 'disable'.")

            return True

        elif cmd == "/retry":
            if self.context.messages:
                # Remove last assistant message
                if self.context.messages[-1].role == MessageRole.ASSISTANT:
                    self.context.messages.pop()
                    # Get last user message
                    if self.context.messages and self.context.messages[-1].role == MessageRole.USER:
                        last_msg = self.context.messages[-1].content
                        self.console.print("🔄 Retrying last message...\n")
                        self._handle_agent_response(last_msg)
                        return True
            self.console.print("Nothing to retry.")
            return True

        elif cmd == "/undo":
            if len(self.context.messages) >= 2:
                # Remove last exchange (user + assistant)
                self.context.messages.pop()  # Remove assistant
                self.context.messages.pop()  # Remove user
                self.console.print("↩️  Last exchange removed.\n")
            else:
                self.console.print("Nothing to undo.")
            return True

        elif cmd == "/copy":
            if self.context.messages:
                # Get last assistant message
                for msg in reversed(self.context.messages):
                    if msg.role == MessageRole.ASSISTANT:
                        try:
                            pyperclip.copy(msg.content)
                            self.console.print("📋 Last response copied to clipboard.")
                        except Exception as e:
                            self.console.print(f"❌ Failed to copy: {e}")
                        return True
            self.console.print("No response to copy.")
            return True

        else:
            self.console.print(f"Unknown command: {command}")
            return True
