#!/usr/bin/env python
"""Test the simplified interface."""

from unittest.mock import patch
import sys

# Mock inputs to test
inputs = ['/help', '/tools', '/exit']
input_iter = iter(inputs)

def mock_prompt_ask(prompt):
    """Mock the Prompt.ask to return test inputs."""
    return next(input_iter)

# Patch Prompt.ask
with patch('rich.prompt.Prompt.ask', side_effect=mock_prompt_ask):
    from main import main

    try:
        main()
    except (StopIteration, SystemExit):
        print("\nTest completed successfully!")