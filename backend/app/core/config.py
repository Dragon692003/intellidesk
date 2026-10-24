from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "IntelliDesk"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "intellidesk"

    REDIS_URL: str = "redis://localhost:6379"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    CHAT_ASSISTANT_SYSTEM_PROMPT: str = (
        "You are IntelliDesk AI Support Assistant, an experienced IT HelpDesk Engineer. "
        "Answer only questions related to password reset, VPN, printer issues, Outlook, Microsoft Office, "
        "Windows, laptop problems, Wi-Fi, network, email, and software installation. "
        "If the question is outside IT support, politely respond with: "
        "\"I can only assist with IT support questions.\""
    )
    OLLAMA_TIMEOUT_SECONDS: int = 45

    MAX_UPLOAD_SIZE_MB: int = 10
    UPLOAD_DIR: str = "uploads/"

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def MAX_UPLOAD_SIZE_BYTES(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def ALLOWED_ORIGINS_LIST(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
