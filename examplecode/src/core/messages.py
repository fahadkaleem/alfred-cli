"""Centralized error and status messages"""


class ErrorMessages:
    """Standard error messages used across the application"""

    FILE_NOT_FOUND = "File does not exist"
    FILE_EMPTY = "File exists but has empty contents"
    PARENT_DIR_NOT_FOUND = "Parent directory does not exist"
    INVALID_PATH = "Invalid file path"
    READ_ERROR = "Error reading file"
    WRITE_ERROR = "Error writing file"
    EDIT_ERROR = "Error editing file"
    STRING_NOT_FOUND = "String not found in file"
    STRING_NOT_UNIQUE = "String appears multiple times in file"
    SAME_STRING_ERROR = "old_string and new_string must be different"
    COMMAND_TIMEOUT = "Command timed out"
    COMMAND_FAILED = "Command failed with exit code"
    TOOL_NOT_FOUND = "Tool not found"
    TOOL_EXECUTION_ERROR = "Error executing tool"


class SuccessMessages:
    """Standard success messages used across the application"""

    FILE_CREATED = "File created successfully"
    FILE_EDITED = "File edited successfully"
    COMMAND_SUCCESS = "Command executed successfully"
    NO_OUTPUT = "Command executed successfully (no output)"
