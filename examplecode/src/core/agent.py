from typing import Any

from anthropic import Anthropic
from rich.console import Console

from src.cli.spinner import LoadingSpinner
from src.core.configuration import ConfigurationManager
from src.core.conversation import ConversationManager, ConversationState
from src.core.tool_coordinator import ToolCoordinator

console = Console()


class Agent:
    """Main agent class that handles conversation and tool execution"""

    def __init__(self):
        """Initialize the agent with Anthropic client and tools"""
        self.config = ConfigurationManager()
        self.client = Anthropic(api_key=self.config.api_key)
        self.conversation = ConversationManager()
        self.tool_coordinator = ToolCoordinator()


    def chat(self, user_message: str) -> str:
        """Process a user message and return the agent's response"""
        # Initialize conversation
        self.conversation.start_user_turn(user_message)
        spinner = LoadingSpinner()

        while self._should_continue_conversation():
            try:
                # Get assistant response
                response = self._get_assistant_response(spinner)

                # Process and store response
                processed = self._process_response(response)

                # Determine next action
                action = self._determine_action(processed["stop_reason"], processed["tool_calls"])

                # Execute action and get result
                result = self._execute_action(action, processed, spinner)

                # Check if conversation is complete
                if result:
                    return result

            except Exception as e:
                return self._handle_error(e)

    def _should_continue_conversation(self) -> bool:
        """Check if the conversation should continue"""
        return self.conversation.state not in [
            ConversationState.COMPLETED,
            ConversationState.ERROR
        ]

    def _get_assistant_response(self, spinner: LoadingSpinner):
        """Get response from Claude API"""
        spinner.start()
        try:
            # Build API parameters
            params = self._build_api_params()

            # Call Claude API
            response = self.client.messages.create(**params)
            return response
        finally:
            spinner.stop()

    def _build_api_params(self) -> dict[str, Any]:
        """Build parameters for Claude API call"""
        params = self.config.get_api_params()
        params.update({
            "messages": self.conversation.get_messages_for_api(),
            "tools": self.tool_coordinator.get_tool_schemas_for_api(),
        })

        if self.config.system_prompt:
            params["system"] = self.config.system_prompt

        return params

    def _process_response(self, response) -> dict[str, Any]:
        """Process the API response"""
        processed = self.conversation.process_response(response)
        self.conversation.add_assistant_response(processed["assistant_content"])
        self.conversation.update_state_for_stop_reason(processed["stop_reason"])
        return processed

    def _determine_action(self, stop_reason: str, tool_calls: list) -> str:
        """Determine what action to take based on stop reason"""
        # Check for tool execution specifically
        if stop_reason == "tool_use" and tool_calls:
            return "execute_tools"

        # Use existing conversation logic for other cases
        if self.conversation.is_complete(stop_reason):
            return "complete"
        elif self.conversation.should_continue(stop_reason):
            return "continue"
        else:
            return "unknown"

    def _execute_action(self, action: str, processed: dict, spinner: LoadingSpinner) -> str | None:
        """Execute the determined action"""
        if action == "execute_tools":
            self._execute_tools(processed["tool_calls"], spinner)
            return None  # Continue conversation

        elif action == "continue":
            if processed["assistant_message"]:
                console.print(f"\n[white]⏺[/white] {processed['assistant_message']}\n")
            return None  # Continue conversation

        elif action in ["complete", "unknown"]:
            self._display_final_response(
                processed["assistant_message"],
                processed["stop_reason"]
            )
            return processed["assistant_message"]

        return None

    def _execute_tools(self, tool_calls: list, spinner: LoadingSpinner) -> None:
        """Execute tool calls and add results to conversation"""
        # Execute tools using coordinator
        tool_results = self.tool_coordinator.execute_tool_calls(tool_calls, spinner)

        # Add tool results to conversation
        formatted_results = self.conversation.format_tool_results(tool_results)
        self.conversation.add_tool_results(formatted_results)

    def _handle_error(self, error: Exception) -> str:
        """Handle errors during conversation"""
        self.conversation.state = ConversationState.ERROR
        error_msg = f"Error in chat: {str(error)}"
        console.print(f"[red]{error_msg}[/red]")
        return error_msg

    def _display_final_response(self, message: str, stop_reason: str) -> None:
        """Display the final response to the user"""
        if stop_reason == "max_tokens":
            console.print("\n[yellow]Warning: Response truncated due to max tokens limit[/yellow]")

        if message:
            console.print(f"\n[white]⏺[/white] {message}\n")

        if stop_reason not in ["end_turn", "max_tokens"] and stop_reason:
            console.print(f"\n[yellow]Conversation ended with stop_reason: {stop_reason}[/yellow]")
