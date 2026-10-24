import asyncio
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings
from app.core import database
from app.core.database import init_db, close_db
from app.core.security import hash_password
from app.models.category import Category
from app.models.user import User

DEFAULT_CATEGORIES = [
    "Technical Issue",
    "Billing & Payments",
    "Account & Access",
    "Feature Request",
    "Bug Report",
    "General Inquiry",
    "Performance Issue",
    "Security Concern",
    "Integration Help",
    "Other",
]


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


async def main() -> None:
    confirm = os.getenv("RESET_DATABASE_CONFIRM", "").strip().upper()
    if confirm != "YES":
        raise RuntimeError("Set RESET_DATABASE_CONFIRM=YES to allow the database reset.")

    admin_name = _require_env("ADMIN_NAME")
    admin_email = _require_env("ADMIN_EMAIL")
    admin_password = _require_env("ADMIN_PASSWORD")

    try:
        await init_db()
        db = database.client[settings.MONGODB_DB_NAME]

        await db["attachments"].delete_many({})
        await db["comments"].delete_many({})
        await db["tickets"].delete_many({})
        await db["categories"].delete_many({})
        await db["users"].delete_many({})

        await User(
            name=admin_name,
            email=admin_email,
            password=hash_password(admin_password),
            role="admin",
            is_active=True,
        ).insert()

        for category_name in DEFAULT_CATEGORIES:
            await Category(name=category_name, description="").insert()

        print("Database reset complete.")
        print(f"Admin created: {admin_email} / role=admin")
        print("Default categories seeded.")
    finally:
        await close_db()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"Reset failed: {exc}")
        sys.exit(1)
