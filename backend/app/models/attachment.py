from beanie import Document
from pydantic import Field
from datetime import datetime, timezone


class Attachment(Document):
    ticket_id: str
    user_id: str
    file_name: str
    file_url: str
    file_size: int       # bytes
    mime_type: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "attachments"
