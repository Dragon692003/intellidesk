from beanie import Document
from pydantic import Field
from datetime import datetime, timezone
from typing import Optional


class ChatHistory(Document):
    user_id: str
    message: str
    ai_reply: Optional[str] = None
    assistant_available: bool = True
    model_used: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "chat_history"
