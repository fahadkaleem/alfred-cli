#!/usr/bin/env python
"""Test the app components without interactive input."""

import logging

from alfred.agent import AnthropicAgent
from alfred.config import get_settings
from alfred.context import ConversationContext, MessageRole
from alfred.tools.calculator import CalculatorTool
from alfred.tools.registry import ToolRegistry

logging.basicConfig(level=logging.INFO)

print("Testing Alfred CLI Components...")

# Test settings
print("\n1. Testing Settings:")
settings = get_settings()
print(f"   Model: {settings.model}")
print(f"   API Key: {settings.anthropic_api_key[:20]}...")

# Test context
print("\n2. Testing Context:")
context = ConversationContext()
context.add_message(MessageRole.USER, "Hello")
context.add_message(MessageRole.ASSISTANT, "Hi there!")
print(f"   Messages: {len(context.messages)}")
print(f"   Last message: {context.get_last_message().content}")

# Test tools
print("\n3. Testing Tools:")
registry = ToolRegistry()
calc = CalculatorTool()
registry.register(calc)
result = registry.execute("calculator", expression="2+2")
print(f"   Calculator result: {result}")

# Test agent connection
print("\n4. Testing Agent:")
try:
    agent = AnthropicAgent(settings, registry)
    if agent.validate_connection():
        print("   ✓ Connection successful")
    else:
        print("   ✗ Connection failed")
except Exception as e:
    print(f"   ✗ Error: {e}")

print("\n✅ Component tests complete!")
