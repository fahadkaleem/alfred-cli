from pydantic import Field
from . import ToolInputSchema


class WriteFileInput(ToolInputSchema):
    """Input schema for write_file tool"""

    file_path: str = Field(
        description="The absolute path to the file to write (must be absolute, not relative)"
    )
    content: str = Field(description="The content to write to the file")
