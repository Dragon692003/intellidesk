from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from app.schemas.ticket import (
    TicketCreate, TicketUpdate, TicketResponse,
    CommentCreate, CommentResponse,
    AISuggestionResponse, AIReplyResponse,
)
from app.models.user import User
from app.core.security import get_current_user, require_agent_or_admin
from app.services import ticket_service
from app.services.ai_service import suggest_category, suggest_reply
from app.services.ticket_service import CATEGORY_AGENT_MAP

router = APIRouter(prefix="/tickets", tags=["Tickets"])
AGENT_EMAIL_TO_CATEGORY = {email: category for category, email in CATEGORY_AGENT_MAP.items()}


def _can_access_ticket(ticket, current_user: User) -> bool:
    if current_user.role == "admin":
        return True
    if current_user.role == "agent":
        return ticket.assigned_agent_id == str(current_user.id)
    return ticket.user_id == str(current_user.id)


# ── Ticket CRUD ──────────────────────────────────────────────────────────────

@router.post("/", response_model=TicketResponse, status_code=201)
async def create_ticket(
    data: TicketCreate,
    current_user: User = Depends(get_current_user),
):
    ticket = await ticket_service.create_ticket(data, str(current_user.id))
    return await _serialize(ticket)


@router.get("/", response_model=list[TicketResponse])
async def list_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(require_agent_or_admin),
):
    if current_user.role == "agent":
        tickets = await ticket_service.get_tickets_for_agent(
            str(current_user.id), skip, limit, status=status, priority=priority, category=category
        )
    else:
        tickets = await ticket_service.get_all_tickets(status, priority, category, skip, limit)
    return [await _serialize(t) for t in tickets]


@router.get("/my", response_model=list[TicketResponse])
async def list_my_tickets(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
):
    tickets = await ticket_service.get_tickets_for_user(str(current_user.id), skip, limit)
    return [await _serialize(t) for t in tickets]


@router.get("/assigned", response_model=list[TicketResponse])
async def list_assigned_tickets(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(require_agent_or_admin),
):
    tickets = await ticket_service.get_tickets_for_agent(str(current_user.id), skip, limit)
    return [await _serialize(t) for t in tickets]


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
):
    ticket = await ticket_service.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not _can_access_ticket(ticket, current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    return await _serialize(ticket)


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    data: TicketUpdate,
    current_user: User = Depends(get_current_user),
):
    existing = await ticket_service.get_ticket(ticket_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not _can_access_ticket(existing, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    ticket = await ticket_service.update_ticket(ticket_id, data, current_user)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return await _serialize(ticket)


@router.delete("/{ticket_id}", status_code=204)
async def delete_ticket(
    ticket_id: str,
    current_user: User = Depends(require_agent_or_admin),
):
    ticket = await ticket_service.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not _can_access_ticket(ticket, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    success = await ticket_service.delete_ticket(ticket_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket not found")


# ── Comments ─────────────────────────────────────────────────────────────────

@router.get("/{ticket_id}/comments", response_model=list[CommentResponse])
async def get_comments(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
):
    ticket = await ticket_service.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not _can_access_ticket(ticket, current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    comments = await ticket_service.get_ticket_comments(ticket_id)
    return [_serialize_comment(comment) for comment in comments]


@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=201)
async def add_comment(
    ticket_id: str,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
):
    ticket = await ticket_service.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not _can_access_ticket(ticket, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    is_agent = current_user.role in ("agent", "admin")
    comment = await ticket_service.add_comment(
        ticket_id, str(current_user.id), data.comment, is_agent, data.ai_generated
    )
    return _serialize_comment(comment)


# ── AI Endpoints ──────────────────────────────────────────────────────────────

@router.post("/ai/suggest-category", response_model=AISuggestionResponse)
async def ai_suggest_category(
    data: TicketCreate,
    current_user: User = Depends(get_current_user),
):
    """AI endpoint: suggest the best category for a ticket before submission."""
    try:
        result = await suggest_category(data.title, data.description)
        return AISuggestionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.get("/{ticket_id}/ai/suggest-reply", response_model=AIReplyResponse)
async def ai_suggest_reply(
    ticket_id: str,
    current_user: User = Depends(require_agent_or_admin),
):
    """AI endpoint: generate a suggested reply draft for agents."""
    ticket = await ticket_service.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not _can_access_ticket(ticket, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    comments = await ticket_service.get_ticket_comments(ticket_id)
    history = [{"comment": c.comment, "is_agent_reply": c.is_agent_reply} for c in comments]

    try:
        result = await suggest_reply(
            ticket_title=ticket.title,
            ticket_description=ticket.description,
            ticket_category=ticket.category or "Technical Issue",
            conversation_history=history,
        )
        return AIReplyResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _serialize(ticket) -> TicketResponse:
    assigned_agent_name = None
    assigned_agent_email = None
    assigned_agent_category = None

    if ticket.assigned_agent_id:
        agent = await User.get(ticket.assigned_agent_id)
        if agent:
            assigned_agent_name = agent.name
            assigned_agent_email = agent.email
            assigned_agent_category = AGENT_EMAIL_TO_CATEGORY.get(agent.email)

    return TicketResponse(
        id=str(ticket.id),
        title=ticket.title,
        description=ticket.description,
        category=ticket.category,
        ai_suggested_category=ticket.ai_suggested_category,
        priority=ticket.priority,
        status=ticket.status,
        user_id=ticket.user_id,
        assigned_agent_id=ticket.assigned_agent_id,
        assigned_agent_name=assigned_agent_name,
        assigned_agent_email=assigned_agent_email,
        assigned_agent_category=assigned_agent_category,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


def _serialize_comment(comment) -> CommentResponse:
    return CommentResponse(
        id=str(comment.id),
        ticket_id=str(comment.ticket_id),
        user_id=str(comment.user_id),
        comment=comment.comment,
        is_agent_reply=comment.is_agent_reply,
        ai_generated=comment.ai_generated,
        created_at=comment.created_at,
    )
