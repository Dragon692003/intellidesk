import asyncio
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ.setdefault("SECRET_KEY", "demo-secret-key")

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core import database
from app.core.config import settings
from app.core.database import close_db, init_db
from app.core.security import hash_password
from app.models.category import Category
from app.models.ticket import Ticket
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

FIRST_NAMES = [
    "Aarav", "Aisha", "Arjun", "Diya", "Ishaan", "Kavya", "Krish", "Meera",
    "Nikhil", "Nina", "Rahul", "Riya", "Sanjay", "Sara", "Tanya", "Varun",
    "Vikram", "Zoya", "Anaya", "Kabir",
]

LAST_NAMES = [
    "Bansal", "Chopra", "Desai", "Fernandez", "Ghosh", "Iyer", "Jain", "Kapoor",
    "Khan", "Malhotra", "Mehta", "Nair", "Patel", "Reddy", "Sharma", "Singh",
    "Srinivasan", "Verma", "Yadav", "Zaman",
]

DEVICES = [
    "Dell laptop",
    "HP desktop",
    "Lenovo ThinkPad",
    "MacBook",
    "Surface Pro",
    "Windows 11 PC",
]

LOCATIONS = [
    "office",
    "home",
    "remote site",
    "conference room",
    "branch office",
]

APPS = [
    "Outlook",
    "Teams",
    "VPN client",
    "printer queue",
    "shared drive",
    "portal",
    "HR app",
    "finance app",
]

TICKET_BLUEPRINTS = {
    "Account & Access": [
        (
            "Password reset not working",
            "{name} reset the password but still cannot sign in to the portal from a {device}.",
        ),
        (
            "Account locked after login attempts",
            "{name} is locked out after multiple failed logins and needs access restored quickly.",
        ),
        (
            "MFA code not accepted",
            "The multi-factor code keeps failing for {name} when they try to access email from {location}.",
        ),
    ],
    "Technical Issue": [
        (
            "Application keeps crashing",
            "{name} says the {app} crashes every time they open it on a {device}.",
        ),
        (
            "Unexpected error message",
            "{name} gets an unexpected error while using the support portal from {location}.",
        ),
        (
            "Device not responding",
            "{name} reports the {device} is freezing and becoming unresponsive during normal work.",
        ),
    ],
    "Billing & Payments": [
        (
            "Invoice not generated",
            "{name} completed payment but the invoice never appeared in the billing portal.",
        ),
        (
            "Payment failed",
            "{name} saw a payment failure while trying to renew a subscription for {app}.",
        ),
        (
            "Refund request follow-up",
            "{name} needs an update on a refund request that has not been processed yet.",
        ),
    ],
    "Feature Request": [
        (
            "Request for new workflow",
            "{name} wants a simpler approval workflow inside {app}.",
        ),
        (
            "Need export option",
            "{name} asked for an export-to-CSV option in the dashboard.",
        ),
        (
            "Suggestion for better alerts",
            "{name} suggested adding better notification controls for team updates.",
        ),
    ],
    "Bug Report": [
        (
            "Form submission bug",
            "{name} says the form submits twice in the {app} on a {device}.",
        ),
        (
            "Incorrect status display",
            "A ticket status is showing the wrong value after a recent update.",
        ),
        (
            "Broken dropdown behavior",
            "{name} reports a dropdown is not opening correctly in the portal.",
        ),
    ],
    "General Inquiry": [
        (
            "Need help with access policy",
            "{name} wants clarification on how to request access to a shared resource.",
        ),
        (
            "How-to question",
            "{name} is asking how to find archived tickets in the system.",
        ),
        (
            "Follow-up on support process",
            "{name} wants to know the expected response time for new requests.",
        ),
    ],
    "Performance Issue": [
        (
            "System running slowly",
            "{name} says the portal is very slow on a {device} while working from {location}.",
        ),
        (
            "Long loading times",
            "{name} is seeing long loading times in {app} after the latest update.",
        ),
        (
            "Lag during peak hours",
            "The application is lagging noticeably during peak usage periods.",
        ),
    ],
    "Security Concern": [
        (
            "Suspicious email report",
            "{name} received a suspicious email and wants it checked by IT.",
        ),
        (
            "Unexpected login alert",
            "{name} got a security alert for a login they did not recognize.",
        ),
        (
            "Phishing concern",
            "{name} suspects a phishing attempt and wants the account reviewed.",
        ),
    ],
    "Integration Help": [
        (
            "API connection issue",
            "{name} cannot connect {app} to a third-party service.",
        ),
        (
            "SSO setup question",
            "{name} needs help with SSO configuration for a new tool.",
        ),
        (
            "Webhook not firing",
            "{name} says the webhook is not triggering after ticket updates.",
        ),
    ],
    "Other": [
        (
            "General support request",
            "{name} submitted a general support request from {location}.",
        ),
        (
            "Need assistance",
            "{name} needs assistance with a miscellaneous IT task.",
        ),
        (
            "Follow-up question",
            "{name} has a follow-up question about a previous support interaction.",
        ),
    ],
}


def _require_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default or "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _make_name(index: int) -> str:
    first = FIRST_NAMES[index % len(FIRST_NAMES)]
    last = LAST_NAMES[(index // len(FIRST_NAMES)) % len(LAST_NAMES)]
    return f"{first} {last}"


def _make_email(index: int) -> str:
    return f"demo.user{index:03d}@example.com"


def _make_user_password() -> str:
    return _require_env("DEMO_USER_PASSWORD", "DemoPass123!")


def _pick_status(rng: random.Random) -> str:
    return rng.choices(
        ["Open", "In Progress", "Resolved", "Closed"],
        weights=[5, 3, 2, 1],
        k=1,
    )[0]


def _pick_priority(rng: random.Random) -> str:
    return rng.choices(
        ["Low", "Medium", "High"],
        weights=[2, 6, 2],
        k=1,
    )[0]


def _pick_category(rng: random.Random) -> str:
    return rng.choice(DEFAULT_CATEGORIES)


def _build_ticket_text(category: str, rng: random.Random, user_name: str) -> tuple[str, str]:
    title, description = rng.choice(TICKET_BLUEPRINTS[category])
    return (
        title.format(name=user_name, device=rng.choice(DEVICES), app=rng.choice(APPS), location=rng.choice(LOCATIONS)),
        description.format(name=user_name, device=rng.choice(DEVICES), app=rng.choice(APPS), location=rng.choice(LOCATIONS)),
    )


async def _seed_categories() -> None:
    existing = await Category.find_all().to_list()
    existing_names = {category.name for category in existing}

    for category_name in DEFAULT_CATEGORIES:
        if category_name not in existing_names:
            await Category(name=category_name, description="").insert()


async def _clear_previous_demo_data(db) -> None:
    demo_email_regex = r"^demo\.user\d{3}@example\.com$"
    demo_users = await db["users"].find({"email": {"$regex": demo_email_regex}}).to_list(length=None)
    demo_user_ids = [str(user["_id"]) for user in demo_users]

    if not demo_user_ids:
        return

    demo_tickets = await db["tickets"].find({"user_id": {"$in": demo_user_ids}}).to_list(length=None)
    demo_ticket_ids = [str(ticket["_id"]) for ticket in demo_tickets]

    if demo_ticket_ids:
        await db["comments"].delete_many({"ticket_id": {"$in": demo_ticket_ids}})
        await db["attachments"].delete_many({"ticket_id": {"$in": demo_ticket_ids}})
        await db["tickets"].delete_many({"_id": {"$in": [ticket["_id"] for ticket in demo_tickets]}})

    await db["chat_history"].delete_many({"user_id": {"$in": demo_user_ids}})
    await db["users"].delete_many({"_id": {"$in": [user["_id"] for user in demo_users]}})


async def _seed_users(count: int, password_hash: str) -> list[User]:
    users: list[User] = []
    for index in range(1, count + 1):
        user = User(
            name=_make_name(index),
            email=_make_email(index),
            password=password_hash,
            role="user",
            is_active=True,
        )
        await user.insert()
        users.append(user)
    return users


async def _seed_tickets(count: int, users: list[User], rng: random.Random) -> None:
    now = datetime.now(timezone.utc)
    for _ in range(count):
        user = rng.choice(users)
        category = _pick_category(rng)
        title, description = _build_ticket_text(category, rng, user.name)

        created_at = now - timedelta(
            days=rng.randint(0, 120),
            hours=rng.randint(0, 23),
            minutes=rng.randint(0, 59),
        )
        updated_at = min(
            now,
            created_at + timedelta(days=rng.randint(0, 7), hours=rng.randint(0, 12), minutes=rng.randint(0, 59)),
        )

        await Ticket(
            title=title,
            description=description,
            category=category,
            ai_suggested_category=category if rng.random() < 0.75 else None,
            priority=_pick_priority(rng),
            status=_pick_status(rng),
            user_id=str(user.id),
            assigned_agent_id=None,
            created_at=created_at,
            updated_at=updated_at,
        ).insert()


async def main() -> None:
    confirm = os.getenv("SEED_DEMO_CONFIRM", "").strip().upper()
    if confirm != "YES":
        raise RuntimeError("Set SEED_DEMO_CONFIRM=YES to allow demo data seeding.")

    user_count = int(os.getenv("DEMO_USER_COUNT", "100"))
    ticket_count = int(os.getenv("DEMO_TICKET_COUNT", "800"))
    seed_value = int(os.getenv("DEMO_SEED", "20260730"))

    if user_count < 1 or ticket_count < 1:
        raise RuntimeError("DEMO_USER_COUNT and DEMO_TICKET_COUNT must both be at least 1.")

    rng = random.Random(seed_value)
    password_hash = hash_password(_make_user_password())

    try:
        await init_db()
        db = database.client[settings.MONGODB_DB_NAME]

        await _clear_previous_demo_data(db)
        await _seed_categories()
        users = await _seed_users(user_count, password_hash)
        await _seed_tickets(ticket_count, users, rng)

        print(f"Seeded {user_count} demo users and {ticket_count} demo tickets.")
        print("Demo user emails use the pattern: demo.user001@example.com")
        print(f"Demo password: {os.getenv('DEMO_USER_PASSWORD', 'DemoPass123!')}")
    finally:
        await close_db()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"Seeding failed: {exc}")
        sys.exit(1)
