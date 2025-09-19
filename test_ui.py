#!/usr/bin/env python
"""Test the UI components rendering."""

from rich.console import Console

from alfred.cli.components import MessageComponent, StatusBar, ToolExecutionView
from alfred.context import MessageRole

console = Console()

print("Testing UI Components Rendering...\n")

# Test message rendering
print("1. Message Components:")
user_msg = MessageComponent("Hello, can you help me?", MessageRole.USER)
console.print(user_msg.render())

assistant_msg = MessageComponent("Of course! I'm here to help.", MessageRole.ASSISTANT)
console.print(assistant_msg.render())

# Test status bar
print("\n2. Status Bar:")
status = StatusBar()
status.update_state(
    model="claude-3-5-sonnet", tokens_used=150, connection_status="connected", tools_available=3
)
console.print(status.render())

# Test tool view
print("\n3. Tool Execution View:")
tool_view = ToolExecutionView("calculator")
tool_view.set_executing({"expression": "2+2"})
console.print(tool_view.render())

tool_view.set_completed("4")
console.print(tool_view.render())

print("\n✅ UI component tests complete!")
