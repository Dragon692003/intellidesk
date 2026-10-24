from __future__ import annotations

import asyncio
import logging
from typing import List

import httpx
from openai import OpenAI

from app.core.config import settings


IT_SUPPORT_FALLBACK = "I can only assist with IT support questions."
OLLAMA_TRY_MODELS = ["llama3.2", "phi3", "mistral"]

logger = logging.getLogger(__name__)

IT_SUPPORT_KEYWORDS = [
    "password",
    "reset",
    "login",
    "log in",
    "vpn",
    "printer",
    "outlook",
    "office",
    "microsoft office",
    "windows",
    "laptop",
    "wifi",
    "wi-fi",
    "network",
    "email",
    "mail",
    "software",
    "install",
    "installation",
    "update",
    "driver",
    "computer",
    "pc",
    "desktop",
    "teams",
    "onedrive",
    "sharepoint",
    "error",
    "issue",
    "not working",
    "broken",
    "slow",
    "can't",
    "cannot",
    "unable",
    "stuck",
]

_openai_client: OpenAI | None = None


def is_it_support_question(message: str) -> bool:
    text = (message or "").strip().lower()
    if not text:
        return False
    return any(keyword in text for keyword in IT_SUPPORT_KEYWORDS)


def build_messages(message: str) -> List[dict]:
    return [
        {"role": "system", "content": settings.CHAT_ASSISTANT_SYSTEM_PROMPT},
        {"role": "user", "content": message},
    ]


def _extract_reply(data: dict) -> str:
    message = data.get("message") or {}
    if isinstance(message, dict):
        content = message.get("content")
        if isinstance(content, str):
            return content.strip()
    response_text = data.get("response")
    if isinstance(response_text, str):
        return response_text.strip()
    return ""


def _get_openai_client() -> OpenAI | None:
    global _openai_client

    api_key = settings.OPENAI_API_KEY.strip()
    if not api_key:
        return None

    if _openai_client is None:
        _openai_client = OpenAI(api_key=api_key, http_client=httpx.Client())
    return _openai_client


def _build_openai_prompt(message: str) -> list[dict]:
    return [
        {
            "role": "system",
            "content": (
                "You are IntelliDesk AI Support Assistant, an experienced IT help desk engineer. "
                "Answer only questions related to password reset, VPN, printer issues, Outlook, "
                "Microsoft Office, Windows, laptop problems, Wi-Fi, network, email, and software installation. "
                "If the question is outside IT support, politely respond with: "
                '"I can only assist with IT support questions."'
            ),
        },
        {"role": "user", "content": message},
    ]


async def _try_openai_reply(message: str) -> str:
    client = _get_openai_client()
    if client is None:
        return ""

    def _run() -> str:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=_build_openai_prompt(message),
            temperature=0.2,
        )
        return (response.choices[0].message.content or "").strip()

    try:
        return await asyncio.to_thread(_run)
    except Exception:
        logger.exception("OpenAI chat request failed")
        return ""


async def _ollama_is_available(client: httpx.AsyncClient) -> bool:
    try:
        response = await client.get("/api/tags")
        response.raise_for_status()
        return True
    except httpx.HTTPError:
        logger.warning("Ollama is not reachable at %s", settings.OLLAMA_BASE_URL)
        return False


async def _try_ollama_reply(message: str) -> str:
    timeout = httpx.Timeout(settings.OLLAMA_TIMEOUT_SECONDS)
    headers = {"Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(base_url=settings.OLLAMA_BASE_URL, timeout=timeout, headers=headers) as client:
            if not await _ollama_is_available(client):
                return ""

            models_to_try = []
            for model in [settings.OLLAMA_MODEL, *OLLAMA_TRY_MODELS]:
                if model not in models_to_try:
                    models_to_try.append(model)

            for model in models_to_try:
                payload = {
                    "model": model,
                    "messages": build_messages(message),
                    "stream": False,
                }
                try:
                    response = await client.post("/api/chat", json=payload)
                    response.raise_for_status()
                    reply = _extract_reply(response.json())
                    if reply:
                        return reply
                except httpx.HTTPStatusError as exc:
                    status_code = exc.response.status_code if exc.response else None
                    body = ""
                    if exc.response is not None:
                        try:
                            body = exc.response.text.lower()
                        except Exception:
                            body = ""
                    if status_code in (404, 400) or "model" in body or "not found" in body:
                        continue
                    logger.exception("Ollama chat request failed for model %s", model)
                    break
                except httpx.RequestError:
                    logger.exception("Ollama request error for model %s", model)
                    break
                except ValueError:
                    logger.exception("Ollama returned invalid JSON for model %s", model)
                    break
    except httpx.RequestError:
        logger.exception("Ollama availability check failed")

    return ""


def _fallback_reply(message: str) -> str:
    text = (message or "").strip().lower()

    if any(keyword in text for keyword in ("password", "reset", "login", "log in", "sign in")):
        return (
            "It sounds like an account access issue. Try these steps:\n\n"
            "1. Wait 5 to 10 minutes if you just reset the password.\n"
            "2. Sign out of all browser tabs and apps, then sign back in.\n"
            "3. Check Caps Lock, keyboard layout, and whether the username is correct.\n"
            "4. Clear the browser cache or try an incognito/private window.\n"
            "5. If it still fails, tell me the exact error message and whether this is email, VPN, or the main portal."
        )

    if "vpn" in text:
        return (
            "For VPN issues, try this checklist:\n\n"
            "1. Disconnect and reconnect to the VPN.\n"
            "2. Restart the VPN client and your device.\n"
            "3. Confirm you have working internet without the VPN.\n"
            "4. Check whether MFA or an expired password is blocking sign-in.\n"
            "5. If it still fails, share the VPN client name and the exact error."
        )

    if "printer" in text:
        return (
            "For printer issues, try this checklist:\n\n"
            "1. Confirm the printer is powered on and connected to the network.\n"
            "2. Remove any stuck print jobs from the queue.\n"
            "3. Restart the printer and your computer.\n"
            "4. Re-add the printer if it no longer appears.\n"
            "5. Send the printer name and any error code if it still will not print."
        )

    if "outlook" in text or "email" in text or "mail" in text:
        return (
            "For Outlook or email issues, try this checklist:\n\n"
            "1. Close and reopen Outlook.\n"
            "2. Check whether webmail works in a browser.\n"
            "3. Send and receive a test email.\n"
            "4. Verify the account password and recent security prompts.\n"
            "5. If it is still failing, share whether this affects desktop Outlook, webmail, or mobile."
        )

    if "wifi" in text or "wi-fi" in text or "network" in text:
        return (
            "For Wi-Fi or network issues, try this checklist:\n\n"
            "1. Toggle Wi-Fi off and on again.\n"
            "2. Forget and reconnect to the network.\n"
            "3. Restart the device and test another website.\n"
            "4. Check whether other devices on the same network are affected.\n"
            "5. If needed, send the error message or the network name."
        )

    if "software" in text or "install" in text or "update" in text:
        return (
            "For software installation issues, try this checklist:\n\n"
            "1. Restart the device and try again.\n"
            "2. Confirm you have admin access if the install needs it.\n"
            "3. Check for pending updates or low disk space.\n"
            "4. If the installer shows an error, note the exact message.\n"
            "5. Tell me the software name and version so I can narrow it down."
        )

    return (
        "I can help with IT support issues. Please share the device, app, or service you are having trouble with, "
        "plus the exact error message if there is one. If you want, I can also help turn this into a ticket."
    )


async def get_ai_reply(message: str) -> dict:
    if not is_it_support_question(message):
        return {
            "reply": IT_SUPPORT_FALLBACK,
            "available": True,
            "warning": None,
            "model_used": None,
        }

    openai_reply = await _try_openai_reply(message)
    if openai_reply:
        return {
            "reply": openai_reply,
            "available": True,
            "warning": None,
            "model_used": f"openai:{settings.OPENAI_MODEL}",
        }

    ollama_reply = await _try_ollama_reply(message)
    if ollama_reply:
        return {
            "reply": ollama_reply,
            "available": True,
            "warning": None,
            "model_used": settings.OLLAMA_MODEL,
        }

    return {
        "reply": _fallback_reply(message),
        "available": True,
        "warning": None,
        "model_used": "heuristic",
    }
