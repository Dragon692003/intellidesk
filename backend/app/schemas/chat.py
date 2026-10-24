from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    available: bool = True
    warning: Optional[str] = None
    model_used: Optional[str] = None


class ChatHistoryResponse(BaseModel):
    id: str
    user_id: str
    message: str
    ai_reply: Optional[str] = None
    assistant_available: bool = True
    model_used: Optional[str] = None
    created_at: datetime
