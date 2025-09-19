"""Configuration management using Pydantic Settings."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings for Alfred CLI."""

    # API Configuration - only what's essential
    anthropic_api_key: str = Field(..., alias="ANTHROPIC_API_KEY")
    model: str = Field(default="claude-3-5-haiku-20241022", alias="ALFRED_MODEL")

    # Sensible defaults that don't need configuration
    max_tokens: int = 4096
    temperature: float = 0.7
    stream_responses: bool = True

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    def validate_api_key(self) -> bool:
        """Check if API key looks valid."""
        return bool(self.anthropic_api_key and self.anthropic_api_key.startswith("sk-"))


def get_settings() -> Settings:
    """Get settings instance."""
    return Settings()
