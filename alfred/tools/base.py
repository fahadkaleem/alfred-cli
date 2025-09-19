"""Base tool class providing consistent interface for all tools."""

import inspect
from abc import ABC, abstractmethod
from typing import Any


class Tool(ABC):
    """Abstract base class for all tools."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique name for the tool."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Description of what the tool does."""
        pass

    @abstractmethod
    def execute(self, **kwargs) -> str:
        """Execute the tool with given parameters.

        All tools must return a string result.
        """
        pass

    def to_anthropic_format(self) -> dict[str, Any]:
        """Convert tool to Anthropic's expected format.

        Uses the execute method's signature to build the schema.
        """
        sig = inspect.signature(self.execute)

        properties = {}
        required = []

        for param_name, param in sig.parameters.items():
            if param_name in ["self", "kwargs"]:
                continue

            # Determine type from annotation
            param_type = "string"  # default
            if param.annotation != param.empty:
                if param.annotation is int:
                    param_type = "integer"
                elif param.annotation is float:
                    param_type = "number"
                elif param.annotation is bool:
                    param_type = "boolean"

            # Get description from docstring if available
            param_desc = f"{param_name} parameter"

            properties[param_name] = {"type": param_type, "description": param_desc}

            # Check if required (no default value)
            if param.default == param.empty:
                required.append(param_name)

        return {
            "name": self.name,
            "description": self.description,
            "input_schema": {"type": "object", "properties": properties, "required": required},
        }
