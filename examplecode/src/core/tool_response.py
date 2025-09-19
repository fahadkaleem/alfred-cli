"""Minimal tool response structure"""
from dataclasses import dataclass


@dataclass
class ToolResponse:
    """Response from tool execution"""
    success: bool
    display_content: str  # What the tool wants displayed
    raw_result: str      # Original result for Agent processing