from pathlib import Path


class PathValidator:
    """Centralized path validation utilities"""

    @staticmethod
    def validate_file_exists(file_path: str) -> tuple[bool, Path, str]:
        """
        Validate if a file exists.
        Returns: (is_valid, path_object, error_message)
        """
        try:
            path_obj = Path(file_path)
            if not path_obj.exists():
                return False, path_obj, f"File {file_path} does not exist"
            return True, path_obj, ""
        except Exception as e:
            return False, None, f"Invalid path: {str(e)}"

    @staticmethod
    def validate_parent_exists(file_path: str) -> tuple[bool, Path, str]:
        """
        Validate if parent directory exists for creating new files.
        Returns: (is_valid, path_object, error_message)
        """
        try:
            path_obj = Path(file_path)
            parent = path_obj.parent
            if not parent.exists():
                return False, path_obj, f"Parent directory {parent} does not exist"
            return True, path_obj, ""
        except Exception as e:
            return False, None, f"Invalid path: {str(e)}"

    @staticmethod
    def is_file_empty(path_obj: Path) -> bool:
        """Check if a file is empty"""
        return path_obj.stat().st_size == 0
