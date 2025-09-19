#!/usr/bin/env python3
"""
Claude Code with Textual UI - A Python implementation with multi-line input support
Uses Textual for the UI with a growing input box at the bottom
"""

from __future__ import annotations

from textual import events
from textual.app import App, ComposeResult
from textual.message import Message
from textual.widgets import TextArea, RichLog, Static
from textual.containers import Vertical, Horizontal
from dotenv import load_dotenv
from rich.console import Console
from rich.text import Text
from rich.panel import Panel
from rich.align import Align
import asyncio
from concurrent.futures import ThreadPoolExecutor

from src.core.agent import Agent
from src.core import agent as agent_module
from src.core import console_renderer
from src.core import configuration

# Load environment variables from .env file
load_dotenv()


class GrowingInput(TextArea):
    """A TextArea that treats Enter as submit and Shift+Enter as newline.

    Posts a ``Submitted`` message with the current text when Enter is pressed
    (without Shift). Clears itself after submit.
    """

    class Submitted(Message):
        def __init__(self, text: str) -> None:
            self.text = text
            super().__init__()

    def _on_key(self, event: events.Key) -> None:
        """Override the internal key handler."""
        # Check for Ctrl+C to quit
        if event.key == "ctrl+c":
            self.app.exit()
            return
            
        # Plain Enter with backslash at end adds newline
        if event.key == "enter":
            if self.text.endswith("\\"):
                # Remove backslash and insert newline
                event.prevent_default()
                event.stop()
                # Delete the backslash character (one character back from cursor)
                self.action_delete_left()
                # Now insert a newline at current cursor position
                self.insert("\n")
            else:
                # Plain Enter: Submit
                event.prevent_default()
                event.stop()
                text = self.text.strip()
                if text:  # Only submit if there's content
                    self.post_message(self.Submitted(text))
                    self.text = ""
        else:
            # Let TextArea handle other keys normally
            super()._on_key(event)


class ClaudeCodeApp(App):
    """Claude Code app with Textual UI.
    
    - Chat output displayed in scrollable log at top
    - Growing input box at bottom (min 3 lines, max 10 lines)
    - Enter inserts newline; Ctrl/Cmd+Enter submits
    - Press Ctrl+C to quit
    """

    CSS = """
    Screen {
        layout: vertical;
        background: black;
    }

    RichLog {
        border: none;
        padding: 1;
        margin: 0 1 1 1;
        background: black;
        scrollbar-size: 1 1;
    }

    GrowingInput {
        height: auto;
        min-height: 3;
        max-height: 10;
        margin: 0 1 1 1;
        padding: 0 1;
        border: round #666666;
        background: black;
        color: white;
    }

    GrowingInput:focus {
        border: round #666666;
    }
    
    GrowingInput > .text-area--selection {
        background: #333333;
        color: white;
    }
    
    GrowingInput > .text-area--cursor {
        background: white;
        color: black;
    }

    #spinner {
        margin: 0 1;
        height: 1;
        color: rgb(175,95,0);
        background: black;
    }
    """

    BINDINGS = [
        ("ctrl+c", "quit", "Quit"),
    ]

    def __init__(self):
        super().__init__()
        self.agent = Agent()
        self.executor = ThreadPoolExecutor(max_workers=1)
        self.spinner_task = None
        self.spinner_chars = ["·", "✢", "✳", "✻"]
        #self.spinner_chars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        self.spinner_index = 0

    def compose(self) -> ComposeResult:
        """Create child widgets for the app."""
        # Chat output log
        self.output_log = RichLog(highlight=True, markup=True, wrap=True)
        self.output_log.can_focus = False  # Make it non-selectable
        yield self.output_log
        
        # Spinner above input box
        self.spinner_label = Static("", id="spinner")
        yield self.spinner_label
        
        # Input box at bottom
        self.input_box = GrowingInput(
            soft_wrap=True,
            id="input",
        )
        yield self.input_box

    def on_mount(self) -> None:
        """Actions to perform when app starts."""
        import os
        # Create welcome content
        cwd = os.getcwd()
        content = Text()
        content.append("✻", style="dark_orange3")
        content.append(" Welcome to ", style="white")
        content.append("Claude Code", style="bold white")
        content.append("!\n\n", style="white")
        content.append("  /help", style="dim")
        content.append(" for help, ", style="white")
        content.append("/status", style="dim")
        content.append(" for your current setup\n\n", style="white")
        content.append(f"  cwd: {cwd}", style="white")
        
        # Create panel with orange border
        panel = Panel(
            content,
            border_style="dark_orange3",
            width=80,
            padding=(0, 1)
        )
        
        self.output_log.write(panel)
        self.output_log.write("")  # Add blank line after
        
        # Focus the input
        self.input_box.focus()

    async def update_spinner(self):
        """Update spinner animation"""
        while True:
            self.spinner_label.update(f"{self.spinner_chars[self.spinner_index]} Thinking...")
            self.spinner_index = (self.spinner_index + 1) % len(self.spinner_chars)
            await asyncio.sleep(0.1)
    
    async def start_spinner(self):
        """Start spinner animation"""
        if not self.spinner_task:
            self.spinner_task = asyncio.create_task(self.update_spinner())
    
    async def stop_spinner(self):
        """Stop spinner animation"""
        if self.spinner_task:
            self.spinner_task.cancel()
            try:
                await self.spinner_task
            except asyncio.CancelledError:
                pass
            self.spinner_task = None
            self.spinner_label.update("")

    async def on_growing_input_submitted(self, message: GrowingInput.Submitted) -> None:
        """Handle input submission."""
        user_text = message.text
        
        # Check for exit commands
        if user_text.lower() in ["exit", "quit", "bye"]:
            self.exit()
            return
        
        # Display user message
        self.output_log.write(Text(f"> {user_text}", style="white"))
        
        # Start spinner
        await self.start_spinner()
        
        # Process message in background thread to avoid blocking UI
        try:
            # Create a custom console that writes to our log
            class LogConsole(Console):
                def __init__(self, log_widget):
                    super().__init__(force_terminal=True, force_interactive=False)
                    self.log_widget = log_widget
                
                def print(self, *args, **kwargs):
                    # Convert to Text and write to log
                    text = self.render_str(*args, **kwargs)
                    self.log_widget.write(text)
            
            # Replace the global console objects in the agent module and its dependencies
            log_console = LogConsole(self.output_log)
            
            # Store original consoles
            original_agent_console = agent_module.console
            original_renderer_console = console_renderer.console
            original_config_console = configuration.console
            
            # Replace all console instances
            agent_module.console = log_console
            console_renderer.console = log_console
            configuration.console = log_console
            
            # Run agent.chat in executor (blocking operation)
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(self.executor, self.agent.chat, user_text)
            
            # Restore original consoles
            agent_module.console = original_agent_console
            console_renderer.console = original_renderer_console
            configuration.console = original_config_console
                
        except Exception as e:
            self.output_log.write(Text(f"Error: {str(e)}", style="red"))
        finally:
            # Stop spinner
            await self.stop_spinner()


if __name__ == "__main__":
    app = ClaudeCodeApp()
    app.run()