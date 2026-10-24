import os
import uuid
import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends

from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User
from app.models.attachment import Attachment

router = APIRouter(prefix="/tickets/{ticket_id}/attachments", tags=["Attachments"])


@router.post("/", status_code=201)
async def upload_attachment(
    ticket_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.size and file.size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large")

    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    async with aiofiles.open(dest_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    attachment = Attachment(
        ticket_id=ticket_id,
        user_id=str(current_user.id),
        file_name=file.filename,
        file_url=f"/uploads/{unique_name}",
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
    )
    await attachment.insert()

    return {
        "id": str(attachment.id),
        "file_name": attachment.file_name,
        "file_url": attachment.file_url,
        "file_size": attachment.file_size,
        "uploaded_at": attachment.uploaded_at,
    }


@router.get("/")
async def list_attachments(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
):
    attachments = await Attachment.find(Attachment.ticket_id == ticket_id).to_list()
    return [
        {
            "id": str(a.id),
            "file_name": a.file_name,
            "file_url": a.file_url,
            "file_size": a.file_size,
            "mime_type": a.mime_type,
            "uploaded_at": a.uploaded_at,
        }
        for a in attachments
    ]
