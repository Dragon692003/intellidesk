from fastapi import APIRouter, HTTPException, Depends
from app.models.user import User
from app.schemas.auth import UserResponse
from app.core.security import require_admin, require_agent_or_admin, get_current_user
from app.services.ticket_service import get_dashboard_stats

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=list[UserResponse])
async def list_users(current_user: User = Depends(require_admin)):
    users = await User.find_all().to_list()
    return [
        UserResponse(id=str(u.id), name=u.name, email=u.email, role=u.role, is_active=u.is_active)
        for u in users
    ]


@router.get("/agents", response_model=list[UserResponse])
async def list_agents(current_user: User = Depends(require_admin)):
    agents = await User.find({"role": "agent"}).to_list()
    return [
        UserResponse(id=str(u.id), name=u.name, email=u.email, role=u.role, is_active=u.is_active)
        for u in agents
    ]


@router.patch("/{user_id}/role")
async def change_user_role(
    user_id: str,
    role: str,
    current_user: User = Depends(require_admin),
):
    if role not in ("admin", "agent", "user"):
        raise HTTPException(status_code=400, detail="Invalid role")
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await user.update({"$set": {"role": role}})
    return {"message": f"Role updated to {role}"}


@router.get("/dashboard/stats")
async def dashboard_stats(current_user: User = Depends(require_agent_or_admin)):
    stats = await get_dashboard_stats()
    total_users = await User.count()
    total_agents = await User.find({"role": "agent"}).count()
    return {**stats, "total_users": total_users, "total_agents": total_agents}
