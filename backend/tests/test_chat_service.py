import os

import pytest

os.environ.setdefault("SECRET_KEY", "test-secret-key")

from app.services.chat_service import IT_SUPPORT_FALLBACK, get_ai_reply


@pytest.mark.asyncio
async def test_non_it_question_gets_safe_fallback_reply():
    result = await get_ai_reply("What is the weather today?")

    assert result["available"] is True
    assert result["reply"] == IT_SUPPORT_FALLBACK
    assert result["warning"] is None


@pytest.mark.asyncio
async def test_it_question_uses_heuristic_reply_when_providers_are_unavailable(monkeypatch):
    async def _empty_openai_reply(message: str) -> str:
        return ""

    async def _empty_ollama_reply(message: str) -> str:
        return ""

    monkeypatch.setattr("app.services.chat_service._try_openai_reply", _empty_openai_reply)
    monkeypatch.setattr("app.services.chat_service._try_ollama_reply", _empty_ollama_reply)

    result = await get_ai_reply("I reset my password but I still cannot log in to my account.")

    assert result["available"] is True
    assert result["warning"] is None
    assert result["model_used"] == "heuristic"
    assert "account access" in result["reply"].lower()
