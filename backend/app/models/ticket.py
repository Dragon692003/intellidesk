from beanie import Document, Link
from pydantic import Field
from typing import Optional, Literal
from datetime import datetime, timezone
from bson import ObjectId

from app.models.user import User
from app.models.category import Category


class Ticket(Document):
    title: str
    description: str
    category: Optional[str] = None          # e.g. "Billing", "Technical", "General"
    ai_suggested_category: Optional[str] = None  # AI suggestion
    priority: Literal["Low", "Medium", "High"] = "Medium"
    status: Literal["Open", "In Progress", "Resolved", "Closed"] = "Open"

    user_id: str                             # Creator
    assigned_agent_id: Optional[str] = None # Assigned agent

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "tickets"
