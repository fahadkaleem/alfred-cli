from pydantic import Field
from typing import Optional
from . import ToolInputSchema


class ReadFileInput(ToolInputSchema):
    """Input schema for read_file tool"""

    file_path: str = Field(description="The absolute path to the file to read")
    offset: Optional[int] = Field(
        default=None,
        description="The line number to start reading from. Only provide if the file is too large to read at once",
    )
    limit: Optional[int] = Field(
        default=None,
        description="The number of lines to read. Only provide if the file is too large to read at once.",
    )
