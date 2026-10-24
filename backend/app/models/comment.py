from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone


class Comment(Document):
    ticket_id: str
    user_id: str
    comment: str
    is_agent_reply: bool = False
    ai_generated: bool = False           # Was this comment AI-suggested?
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "comments"
