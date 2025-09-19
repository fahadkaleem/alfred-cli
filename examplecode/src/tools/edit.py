from ..core.messages import ErrorMessages
from ..core.tool_definition import ToolDefinition
from ..core.tool_registry import ToolRegistry
from ..core.tool_response import ToolResponse
from ..schemas.edit_file import EditFileInput
from .filesystem_tool import FileSystemTool


@ToolRegistry.register
class EditTool(FileSystemTool):
    """Tool for performing exact string replacements in files"""

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="Edit",
            description="Performs exact string replacements in files.\n\nUsage:\n- You must use your `Read` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.\n- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.\n- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.\n- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.\n- The edit will FAIL if `old_string` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use `replace_all` to change every instance of `old_string`.\n- Use `replace_all` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.",
            input_schema=EditFileInput,
            function=self._edit_file,
        )

    def _edit_file(
        self,
        file_path: str,
        old_string: str,
        new_string: str,
        replace_all: bool = False,
    ) -> ToolResponse:
        """Edit a file by replacing old_string with new_string"""
        try:
            # Use base class method for validation
            exists, file_path_obj, relative_path = self._validate_file_exists(file_path)
            if not exists:
                return self._create_error_response(ErrorMessages.FILE_NOT_FOUND)

            # Validate that old_string and new_string are different
            if old_string == new_string:
                return self._create_error_response(ErrorMessages.SAME_STRING_ERROR)

            # Read file content using base class method
            content = self._read_file_content(file_path_obj)

            # Check if old_string exists in content
            if old_string not in content:
                return self._create_error_response(ErrorMessages.STRING_NOT_FOUND)

            # Check for uniqueness if not replace_all
            if not replace_all and content.count(old_string) > 1:
                return self._create_error_response(
                    f"{ErrorMessages.STRING_NOT_UNIQUE}. Appears {content.count(old_string)} times. "
                    f"Use replace_all=true or provide more context."
                )

            # Perform replacement
            if replace_all:
                new_content = content.replace(old_string, new_string)
                replacements = content.count(old_string)
            else:
                new_content = content.replace(old_string, new_string, 1)
                replacements = 1

            # Write updated content using base class method
            self._write_file_content(file_path_obj, new_content)

            replacement_text = (
                f"{replacements} replacement{'s' if replacements > 1 else ''}"
            )
            return self._create_success_response(
                display_content=f"Made {replacement_text} in {relative_path}",
                raw_result=f"Made {replacement_text} in {file_path}"
            )

        except Exception as e:
            return self._create_error_response(f"{ErrorMessages.EDIT_ERROR}: {str(e)}")
