
from pydantic import Field

from . import ToolInputSchema


class BashInput(ToolInputSchema):
    """Input schema for bash tool"""

    command: str = Field(description="The command to execute")
    timeout: int | None = Field(
        default=None, description="Optional timeout in milliseconds (max 600000)"
    )
    description: str | None = Field(
        default=None,
        description="Clear, concise description of what this command does in 5-10 words",
    )
