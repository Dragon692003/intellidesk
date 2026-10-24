from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.core.security import require_admin, get_current_user
from app.models.category import Category
from app.models.user import User
from app.services.ai_service import AVAILABLE_CATEGORIES

router = APIRouter(prefix="/categories", tags=["Categories"])


class CategoryCreate(BaseModel):
    name: str
    description: str = ""


@router.get("/")
async def list_categories(current_user: User = Depends(get_current_user)):
    cats = await Category.find({"name": {"$in": AVAILABLE_CATEGORIES}}).to_list()
    allowed_order = {name: index for index, name in enumerate(AVAILABLE_CATEGORIES)}
    cats.sort(key=lambda c: allowed_order.get(c.name, len(AVAILABLE_CATEGORIES)))
    return [{"id": str(c.id), "name": c.name, "description": c.description} for c in cats]


@router.post("/", status_code=201)
async def create_category(data: CategoryCreate, current_user: User = Depends(require_admin)):
    if data.name not in AVAILABLE_CATEGORIES:
        raise HTTPException(status_code=400, detail="Category is not supported")
    existing = await Category.find_one(Category.name == data.name)
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    cat = Category(name=data.name, description=data.description)
    await cat.insert()
    return {"id": str(cat.id), "name": cat.name, "description": cat.description}


@router.delete("/{category_id}", status_code=204)
async def delete_category(category_id: str, current_user: User = Depends(require_admin)):
    cat = await Category.get(category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if cat.name not in AVAILABLE_CATEGORIES:
        raise HTTPException(status_code=400, detail="Category is not supported")
    await cat.delete()
