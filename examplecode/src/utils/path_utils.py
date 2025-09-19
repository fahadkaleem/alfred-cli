"""Path utilities for consistent display"""
import os
from pathlib import Path


def get_relative_path(absolute_path: str) -> str:
    """Convert absolute path to relative path from current working directory"""
    try:
        path = Path(absolute_path)
        cwd = Path(os.getcwd())
        
        # Try to get relative path
        try:
            rel_path = path.relative_to(cwd)
            return str(rel_path)
        except ValueError:
            # Path is outside current directory, return absolute
            return str(path)
    except Exception:
        # Fallback to original path
        return absolute_path