# IntelliDesk — AI-Powered Help Desk Ticketing System

A production-grade help desk platform with OpenAI-powered ticket categorization and agent reply suggestions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.11+) |
| Database | MongoDB (via Motor async driver) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | JWT (access + refresh tokens) |
| AI | OpenAI GPT-4o |
| Cache | Redis (rate limiting, sessions) |

## Features

- 🎫 Full ticket lifecycle (Open → In Progress → Resolved → Closed)
- 🤖 **AI Category Suggestion** — auto-suggests ticket category on creation
- 💡 **AI Reply Suggestion** — generates smart reply drafts for agents
- 👤 Role-based access (Admin / Agent / User)
- 📎 File attachments per ticket
- 💬 Comments / replies per ticket
- 📊 Admin dashboard with stats

## Project Structure

```
intellidesk/
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── api/v1/        # Route endpoints
│   │   ├── core/          # Config, security, database
│   │   ├── models/        # MongoDB document models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helpers
│   ├── tests/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/              # React application
    └── src/
        ├── components/    # Reusable UI components
        ├── pages/         # Page-level components
        ├── hooks/         # Custom React hooks
        ├── services/      # API service layer
        ├── store/         # Zustand state management
        └── styles/        # Global CSS
```

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # Fill in your values
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local    # Fill in VITE_API_URL
npm run dev
```

## Environment Variables

See `backend/.env.example` and `frontend/.env.example`.

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
