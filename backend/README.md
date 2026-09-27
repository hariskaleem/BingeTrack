# BingeTrack backend

## Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Copy `.env.example` to `.env` and replace the MongoDB Atlas URI and JWT secret.

3. In MongoDB Atlas, add your development IP address under Network Access and create a database user.

4. Start the API:

```bash
npm run dev
```

The API runs on `http://localhost:5000` by default.

## Endpoints

- `GET /api/health`
- `POST /api/auth/register` with `{ "username", "email", "password" }`
- `POST /api/auth/login` with `{ "email", "password" }`

Passwords are hashed with bcrypt before storage. The API returns a JWT after successful registration or login.
