import asyncio
import json
from typing import Any

import httpx
from openai import OpenAI

from app.core.config import settings

AVAILABLE_CATEGORIES = [
    "Account & Access",
    "Technical Issue",
    "Billing & Payments",
    "Bug Report",
]

FALLBACK_CATEGORY_RESULT = {
    "suggested_category": "Technical Issue",
    "confidence": "Low",
    "reasoning": "AI is temporarily unavailable, so a safe technical category was used.",
}

FALLBACK_REPLY_RESULT = {
    "suggested_reply": "Thanks for reaching out. We’re looking into this and will get back to you shortly.\n\nIntelliDesk Support Team",
    "tone": "Friendly",
}

_client = OpenAI(
    api_key=settings.OPENAI_API_KEY.strip(),
    http_client=httpx.Client(),
)


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def _heuristic_category(title: str, description: str) -> dict[str, str]:
    content = f"{title} {description}".lower()
    rules = [
        (("password", "login", "sign in", "sign-in", "account", "reset"), "Account & Access"),
        (("payment", "invoice", "billing", "refund", "charge", "subscription"), "Billing & Payments"),
        (("bug", "error", "crash", "broken", "fails"), "Bug Report"),
        (("technical", "issue", "problem", "not working", "slow", "lag", "timeout", "loading", "printer", "wifi", "wi-fi", "network", "outlook", "office", "windows", "laptop", "software"), "Technical Issue"),
    ]

    for keywords, category in rules:
        if any(keyword in content for keyword in keywords):
            return {
                "suggested_category": category,
                "confidence": "Medium",
                "reasoning": f"Keyword match suggests this is related to {category.lower()}.",
            }

    return FALLBACK_CATEGORY_RESULT.copy()


async def _call_openai(prompt: str) -> str:
    def _run() -> str:
        response = _client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert help desk assistant for IntelliDesk. "
                        "Return only valid JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        return response.choices[0].message.content or "{}"

    return await asyncio.to_thread(_run)


async def suggest_category(title: str, description: str) -> dict:
    categories_list = "\n".join(f"- {c}" for c in AVAILABLE_CATEGORIES)

    prompt = f"""Analyze the following support ticket and classify it.

TICKET TITLE: {title}
TICKET DESCRIPTION: {description}

AVAILABLE CATEGORIES:
{categories_list}

Respond ONLY with a JSON object with this shape:
{{
  "suggested_category": "<exact category name from the list>",
  "confidence": "<High | Medium | Low>",
  "reasoning": "<one sentence explaining why>"
}}"""

    try:
        raw_text = await _call_openai(prompt)
        result = _extract_json(raw_text)
        if result.get("suggested_category") not in AVAILABLE_CATEGORIES:
            result = _heuristic_category(title, description)
        else:
            result.setdefault("confidence", "Medium")
            result.setdefault("reasoning", "The ticket details match the selected category.")
        return result
    except Exception as e:
        print(f"AI ERROR: {type(e).__name__}: {e}")
        return _heuristic_category(title, description)


async def suggest_reply(
    ticket_title: str,
    ticket_description: str,
    ticket_category: str,
    conversation_history: list[dict],
) -> dict:
    history_text = ""
    if conversation_history:
        history_text = "\n\nPREVIOUS CONVERSATION:\n"
        for msg in conversation_history[-5:]:
            role = "Customer" if not msg.get("is_agent_reply") else "Agent"
            history_text += f"{role}: {msg['comment']}\n"

    prompt = f"""Write a professional reply to this support ticket.

TICKET TITLE: {ticket_title}
CATEGORY: {ticket_category}
CUSTOMER DESCRIPTION: {ticket_description}
{history_text}

Guidelines:
- Be professional yet friendly
- Acknowledge the customer issue
- Provide clear helpful steps
- Keep it concise 2 to 3 paragraphs
- Sign off as IntelliDesk Support Team

Respond ONLY with a JSON object:
{{
  "suggested_reply": "<full reply text>",
  "tone": "<Professional | Empathetic | Technical | Friendly>"
}}"""

    try:
        raw_text = await _call_openai(prompt)
        result = _extract_json(raw_text)
        if not result.get("suggested_reply"):
            return FALLBACK_REPLY_RESULT.copy()
        result.setdefault("tone", "Friendly")
        return result
    except Exception as e:
        print(f"AI REPLY ERROR: {type(e).__name__}: {e}")
        return FALLBACK_REPLY_RESULT.copy()
