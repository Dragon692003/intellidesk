from beanie import Document, Indexed
from pydantic import Field
from datetime import datetime, timezone


class Category(Document):
    name: Indexed(str, unique=True)
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "categories"
