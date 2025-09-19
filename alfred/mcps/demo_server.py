#!/usr/bin/env python
"""Simple FastMCP server with demo tools for Alfred CLI.

This server runs over stdio transport for communication with the client.

Usage:
    python alfred/mcps/demo_server.py
"""

import sys
import platform
import random
from datetime import datetime
from typing import Dict, Any

try:
    from fastmcp import FastMCP
except ImportError:
    print("FastMCP not installed. Install with: pip install fastmcp", file=sys.stderr)
    sys.exit(1)


# Initialize FastMCP server
mcp = FastMCP("Alfred MCP Demo Server")


@mcp.tool()
def get_weather(city: str) -> str:
    """Get current weather for a city (simulated data).

    Args:
        city: Name of the city to get weather for

    Returns:
        Weather information as a string
    """
    # Simulated weather data
    conditions = ["Sunny", "Cloudy", "Rainy", "Partly Cloudy", "Overcast"]
    temp = random.randint(10, 35)
    condition = random.choice(conditions)
    humidity = random.randint(30, 90)

    return f"Weather in {city}: {condition}, {temp}°C, Humidity: {humidity}%"


@mcp.tool()
def get_stock_price(symbol: str) -> str:
    """Get current stock price (simulated data).

    Args:
        symbol: Stock ticker symbol (e.g., AAPL, GOOGL)

    Returns:
        Stock price information as a string
    """
    # Simulated stock data
    base_prices = {
        "AAPL": 175.0,
        "GOOGL": 140.0,
        "MSFT": 380.0,
        "AMZN": 170.0,
        "TSLA": 250.0,
    }

    base = base_prices.get(symbol.upper(), 100.0)
    variation = random.uniform(-5, 5)
    price = base + variation
    change = random.uniform(-2, 2)

    return f"{symbol.upper()}: ${price:.2f} ({change:+.2f}%)"


@mcp.tool()
def get_system_info() -> str:
    """Get current system information.

    Returns:
        System information including OS, Python version, and current time
    """
    info = {
        "os": platform.system(),
        "os_version": platform.version(),
        "python_version": platform.python_version(),
        "processor": platform.processor(),
        "current_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "hostname": platform.node(),
    }

    return "\n".join([f"{k}: {v}" for k, v in info.items()])


@mcp.tool()
def calculate_compound_interest(
    principal: float,
    rate: float,
    time: int,
    compounds_per_year: int = 1
) -> str:
    """Calculate compound interest.

    Args:
        principal: Initial amount
        rate: Annual interest rate (as percentage, e.g., 5 for 5%)
        time: Time period in years
        compounds_per_year: Number of times interest compounds per year

    Returns:
        Calculation result as a string
    """
    rate_decimal = rate / 100
    amount = principal * (1 + rate_decimal / compounds_per_year) ** (compounds_per_year * time)
    interest = amount - principal

    return (
        f"Principal: ${principal:.2f}\n"
        f"Rate: {rate}% per year\n"
        f"Time: {time} years\n"
        f"Compounds per year: {compounds_per_year}\n"
        f"Final amount: ${amount:.2f}\n"
        f"Interest earned: ${interest:.2f}"
    )


@mcp.tool()
def roll_dice(sides: int = 6, count: int = 1) -> str:
    """Roll dice and return the results.

    Args:
        sides: Number of sides on each die (default: 6)
        count: Number of dice to roll (default: 1)

    Returns:
        Dice roll results as a string
    """
    if sides < 2:
        return "Error: Dice must have at least 2 sides"
    if count < 1:
        return "Error: Must roll at least 1 die"
    if count > 100:
        return "Error: Cannot roll more than 100 dice at once"

    rolls = [random.randint(1, sides) for _ in range(count)]
    total = sum(rolls)

    if count == 1:
        return f"Rolled a d{sides}: {rolls[0]}"
    else:
        return f"Rolled {count}d{sides}: {rolls} (Total: {total})"


if __name__ == "__main__":
    # Suppress the FastMCP banner
    import os
    import sys

    # Redirect stderr to devnull to suppress banner
    original_stderr = sys.stderr
    sys.stderr = open(os.devnull, 'w')

    try:
        # Run the server using stdio transport
        # This will communicate via stdin/stdout with the client
        mcp.run(transport="stdio")
    finally:
        # Restore stderr
        sys.stderr.close()
        sys.stderr = original_stderr