"""
Basic auth endpoint tests.
Run with: pytest tests/ -v
"""
import pytest
from httpx import AsyncClient
from main import app


@pytest.mark.asyncio
async def test_register_and_login():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Register
        res = await client.post("/api/v1/auth/register", json={
            "name": "Test User",
            "email": "test@intellidesk.com",
            "password": "securepass123",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["email"] == "test@intellidesk.com"

        # Login
        res = await client.post("/api/v1/auth/login", json={
            "email": "test@intellidesk.com",
            "password": "securepass123",
        })
        assert res.status_code == 200
        tokens = res.json()
        assert "access_token" in tokens
        assert "refresh_token" in tokens


@pytest.mark.asyncio
async def test_login_wrong_password():
    async with AsyncClient(app=app, base_url="http://test") as client:
        res = await client.post("/api/v1/auth/login", json={
            "email": "nobody@intellidesk.com",
            "password": "wrongpass",
        })
        assert res.status_code == 401
