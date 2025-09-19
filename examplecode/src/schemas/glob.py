from pydantic import Field
from typing import Optional
from . import ToolInputSchema


class GlobInput(ToolInputSchema):
    """Input schema for glob tool"""

    pattern: str = Field(description="The glob pattern to match files against")
    path: Optional[str] = Field(
        default=None,
        description='The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter "undefined" or "null" - simply omit it for the default behavior. Must be a valid directory path if provided.',
    )
