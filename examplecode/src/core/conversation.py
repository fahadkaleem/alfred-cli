"""Conversation management for the Claude Code agent"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Literal


class ConversationState(Enum):
    """States of the conversation flow"""
    IDLE = "idle"
    WAITING_FOR_RESPONSE = "waiting_for_response"
    PROCESSING_TOOLS = "processing_tools"
    COMPLETED = "completed"
    ERROR = "error"


class StopReason(Enum):
    """Stop reasons from Claude API"""
    END_TURN = "end_turn"
    TOOL_USE = "tool_use"
    MAX_TOKENS = "max_tokens"
    PAUSE_TURN = "pause_turn"
    STOP_SEQUENCE = "stop_sequence"
    REFUSAL = "refusal"


@dataclass
class ConversationTurn:
    """Represents a single turn in the conversation"""
    role: Literal["user", "assistant"]
    content: Any
    timestamp: float | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class ConversationManager:
    """Manages conversation state, message flow, and response processing"""

    def __init__(self):
        """Initialize conversation manager"""
        self.messages: list[dict[str, Any]] = []
        self.state = ConversationState.IDLE
        self.current_turn: ConversationTurn | None = None
        self.turn_count = 0

    def start_user_turn(self, message: str) -> None:
        """Start a new user turn in the conversation"""
        # Validate and clean message
        if not message or not message.strip():
            message = "No input provided"

        # Add to messages
        self.messages.append({
            "role": "user",
            "content": message.strip()
        })

        # Update state
        self.state = ConversationState.WAITING_FOR_RESPONSE
        self.turn_count += 1
        self.current_turn = ConversationTurn(
            role="user",
            content=message.strip()
        )

    def add_assistant_response(self, content: list[dict[str, Any]]) -> None:
        """Add assistant's response to the conversation"""
        # Validate content
        if not content:
            content = [{"type": "text", "text": "No response"}]

        # Add to messages
        self.messages.append({
            "role": "assistant",
            "content": content
        })

        # Update current turn
        self.current_turn = ConversationTurn(
            role="assistant",
            content=content
        )

    def add_tool_results(self, results: list[dict[str, Any]]) -> None:
        """Add tool execution results to the conversation"""
        # Tool results go as user messages in Claude's format
        self.messages.append({
            "role": "user",
            "content": results
        })

        # Update state to indicate we're continuing
        self.state = ConversationState.WAITING_FOR_RESPONSE

    def process_response(self, response) -> dict[str, Any]:
        """Process Claude's response and extract relevant information"""
        result = {
            "stop_reason": response.stop_reason,
            "assistant_message": "",
            "tool_calls": [],
            "assistant_content": []
        }

        # Process content blocks
        for content in response.content:
            if content.type == "text":
                result["assistant_message"] += content.text
                result["assistant_content"].append({
                    "type": "text",
                    "text": content.text
                })
            elif content.type == "tool_use":
                result["tool_calls"].append({
                    "id": content.id,
                    "name": content.name,
                    "input": content.input
                })
                result["assistant_content"].append({
                    "type": "tool_use",
                    "id": content.id,
                    "name": content.name,
                    "input": content.input
                })

        return result

    def should_continue(self, stop_reason: str) -> bool:
        """Determine if conversation should continue based on stop reason"""
        # Tool use and pause require continuation
        return stop_reason in ["tool_use", "pause_turn"]

    def is_complete(self, stop_reason: str) -> bool:
        """Check if conversation turn is complete"""
        # These stop reasons indicate completion
        return stop_reason in ["end_turn", "max_tokens", "stop_sequence", "refusal"]

    def update_state_for_stop_reason(self, stop_reason: str) -> None:
        """Update conversation state based on stop reason"""
        if stop_reason == "tool_use":
            self.state = ConversationState.PROCESSING_TOOLS
        elif self.is_complete(stop_reason):
            self.state = ConversationState.COMPLETED
        elif stop_reason == "pause_turn":
            self.state = ConversationState.WAITING_FOR_RESPONSE
        else:
            # Unknown stop reason
            self.state = ConversationState.IDLE

    def get_messages_for_api(self) -> list[dict[str, Any]]:
        """Get messages formatted for Claude API"""
        return self.messages

    def get_conversation_info(self) -> dict[str, Any]:
        """Get information about the current conversation"""
        return {
            "state": self.state.value,
            "turn_count": self.turn_count,
            "message_count": len(self.messages),
            "current_turn": self.current_turn
        }

    def reset(self) -> None:
        """Reset the conversation to start fresh"""
        self.messages = []
        self.state = ConversationState.IDLE
        self.current_turn = None
        self.turn_count = 0

    def format_tool_results(self, tool_results: list[tuple]) -> list[dict[str, Any]]:
        """Format tool results for adding to conversation"""
        formatted_results = []

        for tool_id, result_content in tool_results:
            # Ensure content is not empty
            if not result_content or not str(result_content).strip():
                result_content = "No output"

            formatted_results.append({
                "type": "tool_result",
                "tool_use_id": tool_id,
                "content": str(result_content)
            })

        return formatted_results
