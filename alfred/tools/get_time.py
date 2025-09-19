"""Time and date tool."""

from datetime import datetime
from zoneinfo import ZoneInfo
from alfred.tools.base import Tool


class TimeTool(Tool):
    """Tool for getting current time in different timezones."""

    @property
    def name(self) -> str:
        return "get_time"

    @property
    def description(self) -> str:
        return "Get the current time in a specified timezone. Defaults to UTC."

    def execute(self, timezone: str = "UTC") -> str:
        """Get the current time in the specified timezone.

        Args:
            timezone: IANA timezone name (e.g., 'America/New_York', 'Asia/Tokyo')

        Returns:
            String with current time in the specified timezone
        """
        try:
            tz = ZoneInfo(timezone)
            now = datetime.now(tz)
            return f"Current time in {timezone}: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}"
        except KeyError:
            # Invalid timezone, show available zones hint and fallback to UTC
            now = datetime.now(ZoneInfo("UTC"))
            return (f"Invalid timezone '{timezone}'. "
                   f"UTC time: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}. "
                   f"Use IANA timezone names like 'America/New_York' or 'Asia/Tokyo'.")
        except Exception as e:
            return f"Error getting time: {str(e)}"