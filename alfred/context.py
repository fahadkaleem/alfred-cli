"""Conversation context management."""

from typing import List, Optional, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel


class MessageRole(str, Enum):
    """Message roles in conversation."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(BaseModel):
    """Single message in conversation."""
    role: MessageRole
    content: Union[str, List[Dict[str, Any]]]  # Can be text or structured content
    metadata: Optional[Dict[str, Any]] = None

    def to_anthropic_format(self) -> Dict[str, Any]:
        """Convert to Anthropic API format."""
        return {"role": self.role.value, "content": self.content}


class ConversationContext:
    """Manages conversation history."""

    def __init__(self, max_messages: int = 50):
        """Initialize with a max message limit to keep it simple."""
        self.messages: List[Message] = []
        self.max_messages = max_messages

    def add_message(self, role: MessageRole, content: Union[str, List[Dict[str, Any]]]) -> None:
        """Add a message to the conversation."""
        message = Message(role=role, content=content)
        self.messages.append(message)

        # Simple trimming - keep last N messages
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages:]

    def get_messages(self) -> List[Dict[str, Any]]:
        """Get messages in Anthropic format."""
        return [msg.to_anthropic_format() for msg in self.messages]

    def clear(self) -> None:
        """Clear all messages."""
        self.messages = []

    def get_last_message(self) -> Optional[Message]:
        """Get the last message if any."""
        return self.messages[-1] if self.messages else None