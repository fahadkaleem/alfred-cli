from pydantic import Field

from . import ToolInputSchema


class EditFileInput(ToolInputSchema):
    """Input schema for edit_file tool"""

    file_path: str = Field(description="The absolute path to the file to modify")
    old_string: str = Field(description="The text to replace")
    new_string: str = Field(
        description="The text to replace it with (must be different from old_string)"
    )
    replace_all: bool = Field(
        default=False,
        description="Replace all occurences of old_string (default false)",
    )
