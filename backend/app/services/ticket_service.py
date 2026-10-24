from datetime import datetime, timezone
from typing import Optional
import logging
from bson import ObjectId

from app.models.user import User
from app.models.ticket import Ticket
from app.models.comment import Comment
from app.models.attachment import Attachment
from app.schemas.ticket import TicketCreate, TicketUpdate
from app.services.ai_service import AVAILABLE_CATEGORIES, suggest_category


logger = logging.getLogger(__name__)

CATEGORY_AGENT_MAP = {
    "Account & Access": "kushisonu32@gmail.com",
    "Technical Issue": "isti@gmail.com",
    "Billing & Payments": "ameen@gmail.com",
    "Bug Report": "yashu@gmail.com",
}


async def _get_agent_id_for_category(category: Optional[str]) -> Optional[str]:
    if not category:
        return None

    agent_email = CATEGORY_AGENT_MAP.get(category)
    if not agent_email:
        return None

    agent = await User.find_one(User.email == agent_email)
    if not agent:
        return None

    if agent.role not in ("agent", "admin"):
        logger.info("Skipping auto-assign for %s because the matched user is not an agent", agent_email)
        return None

    return str(agent.id)


async def create_ticket(data: TicketCreate, user_id: str) -> Ticket:
    """Create a ticket and auto-suggest category via AI."""
    category = data.category if data.category in AVAILABLE_CATEGORIES else None
    ticket = Ticket(
        title=data.title,
        description=data.description,
        category=category,
        priority=data.priority,
        user_id=user_id,
    )

    suggested_category = data.ai_suggested_category
    if suggested_category not in AVAILABLE_CATEGORIES:
        suggested_category = None

    if suggested_category:
        ticket.ai_suggested_category = suggested_category
        if not ticket.category:
            ticket.category = suggested_category
    else:
        # AI category suggestion (runs async, non-blocking)
        try:
            ai_result = await suggest_category(data.title, data.description)
            suggested_category = ai_result.get("suggested_category")
            if suggested_category not in AVAILABLE_CATEGORIES:
                suggested_category = None
            ticket.ai_suggested_category = suggested_category
            # Auto-fill category if not provided by user
            if suggested_category and not ticket.category:
                ticket.category = suggested_category
        except Exception as e:
            print(f"AI category suggestion failed: {e}")

    assigned_agent_id = await _get_agent_id_for_category(ticket.category)
    if assigned_agent_id:
        ticket.assigned_agent_id = assigned_agent_id

    await ticket.insert()
    return ticket


async def get_ticket(ticket_id: str) -> Optional[Ticket]:
    return await Ticket.get(ticket_id)


async def get_tickets_for_user(user_id: str, skip: int = 0, limit: int = 20) -> list[Ticket]:
    return await Ticket.find(Ticket.user_id == user_id).skip(skip).limit(limit).to_list()


async def get_tickets_for_agent(
    agent_id: str,
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
) -> list[Ticket]:
    query = Ticket.find(Ticket.assigned_agent_id == agent_id)
    if status:
        query = query.find(Ticket.status == status)
    if priority:
        query = query.find(Ticket.priority == priority)
    if category:
        query = query.find(Ticket.category == category)
    return await query.skip(skip).limit(limit).sort(-Ticket.created_at).to_list()


async def get_all_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> list[Ticket]:
    query = Ticket.find()
    if status:
        query = query.find(Ticket.status == status)
    if priority:
        query = query.find(Ticket.priority == priority)
    if category:
        query = query.find(Ticket.category == category)
    return await query.skip(skip).limit(limit).sort(-Ticket.created_at).to_list()


async def update_ticket(ticket_id: str, data: TicketUpdate, current_user) -> Optional[Ticket]:
    ticket = await Ticket.get(ticket_id)
    if not ticket:
        return None

    update_data = data.model_dump(exclude_none=True)
    update_data["updated_at"] = datetime.now(timezone.utc)

    await ticket.update({"$set": update_data})
    return await Ticket.get(ticket_id)


async def delete_ticket(ticket_id: str) -> bool:
    ticket = await Ticket.get(ticket_id)
    if not ticket:
        return False
    await ticket.delete()
    return True


async def get_ticket_comments(ticket_id: str) -> list[Comment]:
    return await Comment.find(Comment.ticket_id == ticket_id).sort(+Comment.created_at).to_list()


async def add_comment(ticket_id: str, user_id: str, comment_text: str, is_agent: bool, ai_generated: bool = False) -> Comment:
    comment = Comment(
        ticket_id=ticket_id,
        user_id=user_id,
        comment=comment_text,
        is_agent_reply=is_agent,
        ai_generated=ai_generated,
    )
    await comment.insert()
    # Update ticket updated_at
    await Ticket.find_one(Ticket.id == ObjectId(ticket_id)).update(
        {"$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    return comment


async def get_dashboard_stats() -> dict:
    total = await Ticket.count()
    open_count = await Ticket.find(Ticket.status == "Open").count()
    in_progress = await Ticket.find(Ticket.status == "In Progress").count()
    resolved = await Ticket.find(Ticket.status == "Resolved").count()
    closed = await Ticket.find(Ticket.status == "Closed").count()

    return {
        "total": total,
        "open": open_count,
        "in_progress": in_progress,
        "resolved": resolved,
        "closed": closed,
    }
