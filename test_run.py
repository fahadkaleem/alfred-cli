#!/usr/bin/env python
"""Test run with minimal interaction."""

import sys
import io
from unittest.mock import patch, MagicMock

# Mock the input to avoid interactive prompt
def mock_get_input():
    # Simulate user typing /exit
    return "/exit"

# Patch the get_input method
with patch('alfred.cli.components.input_box.InputBox.get_input', side_effect=mock_get_input):
    # Import and run main
    from main import main

    try:
        main()
    except SystemExit:
        print("\nApp exited successfully!")