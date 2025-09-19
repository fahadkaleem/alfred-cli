"""Core agent that interfaces with Anthropic API."""

import json
import logging
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any

from anthropic import Anthropic
from pydantic import BaseModel

from alfred.config import Settings
from alfred.context import ConversationContext, MessageRole
from alfred.tools.registry import ToolRegistry


@dataclass
class ToolCall:
    """Tool call from Claude."""

    id: str
    name: str
    input: dict[str, Any]


class StreamChunk(BaseModel):
    """Single chunk in streaming response."""

    delta: str
    is_complete: bool = False
    tool_calls: list[ToolCall] | None = None


class AgentResponse(BaseModel):
    """Complete response from the agent."""

    content: str
    tool_calls: list[ToolCall] | None = None
    usage: dict[str, Any] | None = None


class AnthropicAgent:
    """Core agent that interfaces with Anthropic API."""

    def __init__(self, settings: Settings, tool_registry: ToolRegistry | None = None):
        """Initialize agent with settings and optional tools."""
        self.settings = settings
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.logger = logging.getLogger(__name__)
        self.tool_registry = tool_registry
        self.anthropic_tools = tool_registry.get_anthropic_tools() if tool_registry else None

    def send_message(
        self,
        message: str,
        context: ConversationContext,
        stream: bool = True,
        tools: list | None = None,
    ) -> Iterator[StreamChunk] | AgentResponse:
        """Send a message and get response."""
        # Add user message to context
        context.add_message(MessageRole.USER, message)
        return self._get_completion(context, stream, tools)

    def send_tool_results(
        self,
        tool_results: list[dict],
        context: ConversationContext,
        stream: bool = True,
        tools: list | None = None,
    ) -> Iterator[StreamChunk] | AgentResponse:
        """Send tool results back to Claude."""
        # Format tool results as user message
        context.add_message(MessageRole.USER, tool_results)
        return self._get_completion(context, stream, tools)

    def _get_completion(
        self, context: ConversationContext, stream: bool = True, tools: list | None = None
    ) -> Iterator[StreamChunk] | AgentResponse:
        """Get completion from API."""
        try:
            if stream:
                return self._stream_response(context, tools)
            else:
                return self._get_response(context, tools)
        except Exception as e:
            self.logger.error(f"Error calling Anthropic API: {e}")
            raise

    def _stream_response(
        self, context: ConversationContext, tools: list | None = None
    ) -> Iterator[StreamChunk]:
        """Get streaming response from API."""
        kwargs = {
            "model": self.settings.model,
            "max_tokens": self.settings.max_tokens,
            "temperature": self.settings.temperature,
            "messages": context.get_messages(),
        }

        # Add tools if available
        if tools or self.anthropic_tools:
            kwargs["tools"] = tools or self.anthropic_tools

        with self.client.messages.stream(**kwargs) as stream:
            full_text = []
            tool_calls = []
            current_tool_call = None

            for event in stream:
                if event.type == "content_block_start":
                    if hasattr(event.content_block, "type"):
                        if event.content_block.type == "tool_use":
                            current_tool_call = {
                                "id": event.content_block.id,
                                "name": event.content_block.name,
                                "input": {},
                            }

                elif event.type == "content_block_delta":
                    if hasattr(event.delta, "text"):
                        text = event.delta.text
                        full_text.append(text)
                        yield StreamChunk(delta=text, is_complete=False)
                    elif hasattr(event.delta, "partial_json"):
                        # Accumulate tool input
                        if current_tool_call:
                            # Just accumulate the JSON string
                            if "input_json" not in current_tool_call:
                                current_tool_call["input_json"] = ""
                            current_tool_call["input_json"] += event.delta.partial_json

                elif event.type == "content_block_stop":
                    if current_tool_call:
                        # Parse the accumulated JSON
                        input_data = json.loads(current_tool_call.get("input_json", "{}"))

                        tool_calls.append(
                            ToolCall(
                                id=current_tool_call["id"],
                                name=current_tool_call["name"],
                                input=input_data,
                            )
                        )
                        current_tool_call = None

            # Build final message content
            final_content = []
            if full_text:
                final_content.append({"type": "text", "text": "".join(full_text)})
            for tool_call in tool_calls:
                final_content.append(
                    {
                        "type": "tool_use",
                        "id": tool_call.id,
                        "name": tool_call.name,
                        "input": tool_call.input,
                    }
                )

            # Add to context
            if final_content:
                context.add_message(MessageRole.ASSISTANT, final_content)

            yield StreamChunk(
                delta="", is_complete=True, tool_calls=tool_calls if tool_calls else None
            )

    def _get_response(
        self, context: ConversationContext, tools: list | None = None
    ) -> AgentResponse:
        """Get non-streaming response from API."""
        kwargs = {
            "model": self.settings.model,
            "max_tokens": self.settings.max_tokens,
            "temperature": self.settings.temperature,
            "messages": context.get_messages(),
        }

        # Add tools if available
        if tools or self.anthropic_tools:
            kwargs["tools"] = tools or self.anthropic_tools

        response = self.client.messages.create(**kwargs)

        # Parse response content
        text_content = ""
        tool_calls = []
        final_content = []

        for content_block in response.content:
            if content_block.type == "text":
                text_content += content_block.text
                final_content.append({"type": "text", "text": content_block.text})
            elif content_block.type == "tool_use":
                tool_calls.append(
                    ToolCall(
                        id=content_block.id, name=content_block.name, input=content_block.input
                    )
                )
                final_content.append(
                    {
                        "type": "tool_use",
                        "id": content_block.id,
                        "name": content_block.name,
                        "input": content_block.input,
                    }
                )

        # Add response to context
        context.add_message(MessageRole.ASSISTANT, final_content if final_content else text_content)

        return AgentResponse(
            content=text_content,
            tool_calls=tool_calls if tool_calls else None,
            usage={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
        )

    def validate_connection(self) -> bool:
        """Test connection to Anthropic API."""
        try:
            # Simple test - try to create a minimal message
            response = self.client.messages.create(
                model=self.settings.model,
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}],
            )
            return bool(response)
        except Exception as e:
            self.logger.error(f"Connection validation failed: {e}")
            return False
