from fastapi import APIRouter
from app.api.v1.endpoints import auth, tickets, users, attachments, categories, chat

router = APIRouter()
router.include_router(auth.router)
router.include_router(tickets.router)
router.include_router(users.router)
router.include_router(attachments.router)
router.include_router(categories.router)
router.include_router(chat.router)
