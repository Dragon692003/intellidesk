from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.models.chat_history import ChatHistory
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, ChatHistoryResponse
from app.services.chat_service import get_ai_reply

router = APIRouter(prefix="/chat", tags=["AI Assistant"])


@router.post("", response_model=ChatResponse)
async def chat(data: ChatRequest, current_user: User = Depends(get_current_user)):
    message = data.message.strip()
    result = await get_ai_reply(message)

    history = ChatHistory(
        user_id=str(current_user.id),
        message=message,
        ai_reply=result["reply"] or None,
        assistant_available=result["available"],
        model_used=result["model_used"],
    )
    await history.insert()

    return ChatResponse(
        reply=result["reply"],
        available=result["available"],
        warning=result["warning"],
        model_used=result["model_used"],
    )


@router.get("/history", response_model=list[ChatHistoryResponse])
async def get_history(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
):
    entries = (
        await ChatHistory.find(ChatHistory.user_id == str(current_user.id))
        .sort(+ChatHistory.created_at)
        .limit(limit)
        .to_list()
    )
    return [
        ChatHistoryResponse(
            id=str(entry.id),
            user_id=entry.user_id,
            message=entry.message,
            ai_reply=entry.ai_reply,
            assistant_available=entry.assistant_available,
            model_used=entry.model_used,
            created_at=entry.created_at,
        )
        for entry in entries
    ]
