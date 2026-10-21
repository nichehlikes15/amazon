
# Launchpad — Amazon T Level Placements Website

A T Level team project for the Amazon Emerging Talent Programs Team. Launchpad is a
website where students can discover T Levels, placements, apprenticeships and colleges,
take a career-matching quiz, and register their interest with Amazon.

## Tech stack

- **Front end:** React 19 + Vite (JavaScript / JSX)
- **Back end:** Python + Flask (REST API)
- **Database:** SQLite
- **Auth:** email + password, hashed with werkzeug; session cookie

This gives a clear front-end / back-end split in two distinct languages (JavaScript and
Python), with SQL as the database language — meeting the brief's "at least two languages"
requirement.

## Project structure

```
amazon/
├── backend/            Python Flask API
│   ├── app.py          server + all API routes
│   ├── schema.sql      database tables (users, expressions_of_interest)
│   ├── requirements.txt
│   └── launchpad.db    created automatically on first run
└── src/                React front end
    ├── modules/        navbar, footer, auth, api helper, accessibility
    ├── pages/          home, information, profile, quiz, settings,
    │                   login, signup, register-interest, admin, etc.
    └── styles/         global.css (theme + accessibility)
```

## Running the project

You need **two terminals** — one for the backend, one for the front end.

### 1. Backend (Flask API)

```
cd backend
python3 -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The API runs on **http://localhost:5000**. The SQLite database (`launchpad.db`) and its
tables are created automatically the first time you run it.

### 2. Front end (React + Vite)

In a second terminal:

```
npm install
npm run dev
```

The site runs on **http://localhost:5173** and talks to the backend automatically.

## Key pages

| Page | Route | What it does |
|------|-------|--------------|
| Home | `/` | Hero, pathways, benefits, FAQ |
| Information | `/information` | The five T Level pathways in detail |
| Career quiz | `/quiz` | Suggests a pathway from your answers |
| Sign up / Sign in | `/signup`, `/login` | Create an account / log in |
| Profile | `/profile` | Student dashboard (requires login) |
| Register interest | `/register-interest` | Expression-of-interest form |
| Admin | `/admin` | Lists all expressions of interest |
| Settings | `/settings` | Account + accessibility preferences |

## API endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/signup` | Create an account |
| POST | `/api/login` | Log in |
| POST | `/api/logout` | Log out |
| GET  | `/api/me` | Current logged-in user |
| POST | `/api/interest` | Save an expression of interest |
| GET  | `/api/interest` | List all expressions of interest (admin) |

## Accessibility

Settings lets users change text size, turn on a colour-blind friendly palette, and reduce
motion. Choices are saved in the browser and applied across the whole site.

## Admin access

The `/admin` page lists every expression of interest. It is restricted: only a logged-in
user whose account has `is_admin = 1` can open it or read `GET /api/interest`. Everyone
else is redirected (or gets a 403 from the API).

There is no "make me an admin" button by design. To grant admin to an account, set the
flag directly in the database (after that account has signed up):

```
cd backend
sqlite3 launchpad.db "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';"
```

Sign out and back in for the change to take effect. The Admin link then appears in the
account menu.

## Security notes (prototype)

- Passwords are hashed (never stored as plain text).
- All database queries are parameterised, so there is no SQL injection risk.
- CORS is limited to the local dev front end.
- The `/admin` page and its API are gated behind an admin-only check (see above).
- For a production release you would also add: HTTPS, CSRF protection, rate limiting,
  stronger session storage, and email verification.

## Notes for the team

- Keep the assets log updated with any images/content sources.
- Research tasks use Amazon AI only (per the brief); writing project code does not.
