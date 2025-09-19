from collections.abc import Callable
from dataclasses import dataclass

from pydantic import BaseModel


@dataclass
class ToolDefinition:
    """Definition of a tool that can be used by the agent"""

    name: str
    description: str
    input_schema: type[BaseModel]
    function: Callable
