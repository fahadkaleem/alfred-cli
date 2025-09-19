#!/usr/bin/env python
"""Test the cleaned up implementation."""

from unittest.mock import patch

# Mock inputs to test
inputs = ["/help", "/tools", "/tool disable calculator", "/tools", "/exit"]
input_iter = iter(inputs)


def mock_prompt_ask(prompt):
    """Mock the Prompt.ask to return test inputs."""
    return next(input_iter)


# Patch Prompt.ask and pyperclip
with patch("rich.prompt.Prompt.ask", side_effect=mock_prompt_ask):
    with patch("pyperclip.copy"):
        from main import main

        try:
            main()
        except (StopIteration, SystemExit):
            print("\nTest completed successfully!")
