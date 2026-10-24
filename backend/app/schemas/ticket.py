from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


class TicketCreate(BaseModel):
    title: str
    description: str
    category: Optional[str] = None
    ai_suggested_category: Optional[str] = None
    priority: Literal["Low", "Medium", "High"] = "Medium"


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[Literal["Low", "Medium", "High"]] = None
    status: Optional[Literal["Open", "In Progress", "Resolved", "Closed"]] = None
    assigned_agent_id: Optional[str] = None


class TicketResponse(BaseModel):
    id: str
    title: str
    description: str
    category: Optional[str]
    ai_suggested_category: Optional[str]
    priority: str
    status: str
    user_id: str
    assigned_agent_id: Optional[str]
    assigned_agent_name: Optional[str] = None
    assigned_agent_email: Optional[str] = None
    assigned_agent_category: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CommentCreate(BaseModel):
    comment: str
    ai_generated: bool = False


class CommentResponse(BaseModel):
    id: str
    ticket_id: str
    user_id: str
    comment: str
    is_agent_reply: bool
    ai_generated: bool
    created_at: datetime


class AISuggestionResponse(BaseModel):
    suggested_category: str
    confidence: str
    reasoning: str


class AIReplyResponse(BaseModel):
    suggested_reply: str
    tone: str
