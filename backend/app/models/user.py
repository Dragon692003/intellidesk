from beanie import Document, Indexed
from pydantic import EmailStr, Field
from typing import Optional, Literal
from datetime import datetime, timezone


class User(Document):
    name: str
    email: Indexed(EmailStr, unique=True)
    password: str
    role: Literal["admin", "agent", "user"] = "user"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Jane Doe",
                "email": "jane@example.com",
                "role": "user",
            }
        }
