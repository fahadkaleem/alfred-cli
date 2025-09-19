from typing import Literal

from pydantic import Field

from . import ToolInputSchema


class GrepInput(ToolInputSchema):
    """Input schema for grep tool"""

    pattern: str = Field(
        description="The regular expression pattern to search for in file contents"
    )
    path: str | None = Field(
        default=None,
        description="File or directory to search in (rg PATH). Defaults to current working directory.",
    )
    glob: str | None = Field(
        default=None,
        description='Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}") - maps to rg --glob',
    )
    output_mode: Literal["content", "files_with_matches", "count"] | None = Field(
        default="files_with_matches",
        description='Output mode: "content" shows matching lines (supports -A/-B/-C context, -n line numbers, head_limit), "files_with_matches" shows file paths (supports head_limit), "count" shows match counts (supports head_limit). Defaults to "files_with_matches".',
    )
    B: int | None = Field(
        default=None,
        alias="-B",
        description='Number of lines to show before each match (rg -B). Requires output_mode: "content", ignored otherwise.',
    )
    A: int | None = Field(
        default=None,
        alias="-A",
        description='Number of lines to show after each match (rg -A). Requires output_mode: "content", ignored otherwise.',
    )
    C: int | None = Field(
        default=None,
        alias="-C",
        description='Number of lines to show before and after each match (rg -C). Requires output_mode: "content", ignored otherwise.',
    )
    n: bool | None = Field(
        default=None,
        alias="-n",
        description='Show line numbers in output (rg -n). Requires output_mode: "content", ignored otherwise.',
    )
    i: bool | None = Field(
        default=None, alias="-i", description="Case insensitive search (rg -i)"
    )
    type: str | None = Field(
        default=None,
        description="File type to search (rg --type). Common types: js, py, rust, go, java, etc. More efficient than include for standard file types.",
    )
    head_limit: int | None = Field(
        default=None,
        description='Limit output to first N lines/entries, equivalent to "| head -N". Works across all output modes: content (limits output lines), files_with_matches (limits file paths), count (limits count entries). When unspecified, shows all results from ripgrep.',
    )
    multiline: bool | None = Field(
        default=False,
        description="Enable multiline mode where . matches newlines and patterns can span lines (rg -U --multiline-dotall). Default: false.",
    )

    class Config:
        populate_by_name = True
