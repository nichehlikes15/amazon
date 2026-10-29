# Launchpad - Amazon T Level Placements Website

A T Level Team Project (Digital) for the **Amazon Emerging Talent Programs Team**.

Launchpad helps students, parents and carers, and schools learn about T Levels and
Amazon T Level placements. Students can find opportunities, take a career quiz, practise
interviews with a virtual interviewer, book coffee chats, keep a placement logbook and
register their interest with Amazon.

**Team:** Bea Galang, Michael Lawrence, Nahla Mitchell, Oliver Tappin, Sarah Abwnawar,
Tasniim Dirie.

---

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Running the project](#running-the-project)
5. [Turning on the AI](#turning-on-the-ai)
6. [Settings](#settings)
7. [Admin access](#admin-access)
8. [Pages](#pages)
9. [API endpoints](#api-endpoints)
10. [Database](#database)
11. [Security](#security)
12. [Privacy and safeguarding](#privacy-and-safeguarding)
13. [Accessibility](#accessibility)
14. [Known limits](#known-limits)

---

## Features

### For everyone
- **T Level information:** what a T Level is, the five pathways (Digital, Business,
  Media, Finance, Engineering), how Amazon placements work, and advice.
- **Opportunities:** a list of opportunities you can filter and sort, with a page for
  each one.
- **Career quiz:** suggests a pathway, then gives four next steps for that pathway and
  matching opportunities.
- **Interview practice:** a practice video call with **Alex**, a virtual interviewer.
  Answer out loud or by typing, get feedback after each answer, and a summary at the end.
- **Coffee chats:** ask for a short, relaxed chat with a member of the team.
- **Question board:** ask and answer questions. Every post is checked by an admin first.
- **Ask Launchpad:** a help chat on every page that answers questions using facts
  from the site, and can read its answers aloud.
- **Parents and carers page**, **Staying safe page**, and a **Register interest** form
  for students, parents and carers, and schools.
- **"Was this page helpful?"** feedback at the bottom of each page.

### When you sign in
- **My profile:** saved opportunities, an application tracker board, coffee chats,
  interview practice scores and your CV.
- **Application tracker:** drag opportunities between Saved, Preparing, Applied,
  Interview and Result.
- **CV checker:** upload a CV to get a score out of 100 and tips. Alex can then ask you
  a question about it in interview practice.
- **My logbook:** set technical and employability goals, add a weekly placement entry,
  track your hours against the 315-hour target, and print it or save it as a PDF.
- **Full guides:** the downloadable guide PDFs are for signed-in users only.
- **Settings:** change your details and password, set display and accessibility options,
  download your data, or delete your account.

### For admins
- Expressions of interest, coffee chat requests (set status, time and meeting link),
  adding opportunities, question board approvals, page feedback and a KPI dashboard.
  Tables can be downloaded as CSV files.

---

## Tech stack

| Part | What we used |
|---|---|
| Front end | React 19, React Router 7, Vite 8 (JavaScript / JSX, CSS) |
| Back end | Python 3, Flask 3, flask-cors, pypdf |
| Database | SQLite (SQL) |
| AI | A local language model through [Ollama](https://ollama.com) (default `llama3.2`) |
| Voice | The browser's built-in speech recognition and speech synthesis |

The front end and back end are written in different languages (JavaScript and Python),
with SQL for the database. This meets the brief's "at least two languages" requirement.

---

## Project structure

```
amazon/
├── backend/                  Python Flask API
│   ├── app.py                server and all API routes
│   ├── schema.sql            database tables and starting data
│   ├── interview_coach.py    interview scoring and replies (rule-based)
│   ├── llm_coach.py          AI replies through Ollama (optional)
│   ├── cv_reviewer.py        CV scoring out of 100 (rule-based)
│   ├── guides/               guide PDFs (signed-in users only)
│   ├── AI_SETUP.md           how to turn on the AI
│   ├── requirements.txt
│   ├── launchpad.db          created on first run (not in git)
│   └── uploads/              uploaded CVs and files (not in git)
├── public/                   logo, favicon, photos and images
├── src/
│   ├── app.jsx               routes
│   ├── modules/              shared parts: navbar, footer, API helper, sign-in,
│   │                         accessibility, read aloud, voice, Ask Launchpad,
│   │                         page feedback, icons, coffee chat people
│   ├── pages/                one .jsx (and usually one .css) per page
│   └── styles/global.css     colours, spacing, dark mode, high contrast, zoom
├── .env.example              example settings
├── index.html
├── package.json
└── vite.config.js
```

---

## Running the project

You need **two terminals**: one for the backend and one for the front end.

### 1. Backend (Flask API)

```
cd backend
python3 -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The API runs on **http://localhost:5000**. The database (`launchpad.db`) and its tables
are created the first time it runs. Restart it after changing any backend file.

### 2. Front end (React + Vite)

In a second terminal, from the project folder:

```
npm install
npm run dev
```

The site runs on **http://localhost:5173**.

### Other commands

| Command | What it does |
|---|---|
| `npm run build` | Builds the site for release into `dist/` |
| `npm run preview` | Previews the built site |
| `npm run lint` | Checks the front-end code with ESLint |

---

## Turning on the AI

The AI is optional. Without it, everything still works using fixed, rule-based replies.

With it on:
- **Alex** replies to what you said, writes his own follow-up questions, explains your
  feedback and writes the summary at the end.
- **Alex** can ask a question about your CV.
- **Ask Launchpad** writes its answers in its own words.

Scores are **always** worked out by fixed rules, so the same answer always gets the same
score. The AI only writes the words.

Quick setup:

1. Install Ollama from https://ollama.com/download and open it.
2. Download the model: `ollama pull llama3.2`
3. Start the backend as normal.

On the Interview practice page, a green dot means the AI is working. Full steps are in
[`backend/AI_SETUP.md`](backend/AI_SETUP.md).

For better replies, use a bigger model (slower, needs more memory):

```
ollama pull llama3.1:8b
OLLAMA_MODEL=llama3.1:8b python app.py
```

---

## Settings

Copy `.env.example` to `.env` for a live site. All settings are optional for local use.

| Setting | Default | What it does |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | Where the front end finds the backend |
| `LAUNCHPAD_SECRET` | built-in development value | Secret for sign-in cookies. **Must** be set to a long random value for a live site |
| `LAUNCHPAD_ORIGINS` | `http://localhost:5173` | Which website addresses may call the API |
| `LAUNCHPAD_SECURE_COOKIES` | `0` | Set to `1` once the site uses HTTPS |
| `LAUNCHPAD_AI` | `ollama` | Set to `off` to always use the fixed replies |
| `OLLAMA_URL` | `http://localhost:11434` | Where Ollama is running |
| `OLLAMA_MODEL` | `llama3.2` | Which model to use |
| `OLLAMA_TIMEOUT` | `15` | Seconds to wait for the AI before using the fixed reply |

---

## Admin access

There is no "make me an admin" button, on purpose. Sign up first, then set the flag in
the database:

```
cd backend
sqlite3 launchpad.db "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';"
```

Sign out and back in. **Admin** then appears in the account menu. Only admins can open
`/admin` or call the admin API endpoints. Everyone else gets a `403` error.

### Resetting a password

The prototype doesn't send emails. When someone asks to reset their password, the reset
link is printed in the **backend terminal**. It works once and lasts 30 minutes.

---

## Pages

| Page | Route | Sign in needed |
|---|---|---|
| Home | `/` | |
| Opportunities | `/opportunities` | |
| Opportunity details | `/opportunities/:id` | To save and track |
| T Levels | `/tlevel` | |
| What is a T Level | `/what-is-a-t-level` | |
| Pathways | `/information` | |
| Advice | `/t-level/advice` | |
| Guides | `/guides/:slug` | For the full guide |
| Career quiz | `/quiz` | |
| Interview practice | `/interview` | To save scores |
| Alumni / career journey | `/alumni` | |
| Coffee chats | `/alumni/coffee-chats` | |
| Question board | `/community` | To post |
| Parents and carers | `/parents` | |
| Register interest | `/register-interest` | |
| About us | `/about-us` | |
| My profile | `/profile` | Yes |
| My logbook | `/logbook` | Yes |
| Settings | `/settings` | Yes |
| Sign in / Create account | `/login`, `/signup` | |
| Forgot / reset password | `/forgot-password`, `/reset-password` | |
| Admin | `/admin` | Admin only |
| Help, Accessibility, Privacy, Terms, Staying safe | `/help`, `/accessibility`, `/privacy`, `/terms`, `/safeguarding` | |

---

## API endpoints

All endpoints start with `/api`. "Signed in" means a sign-in cookie is needed.

### Accounts

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/signup` | Create an account |
| POST | `/login` | Sign in |
| POST | `/logout` | Sign out |
| GET | `/me` | The signed-in user |
| PUT | `/me` | Update name, email, school and email preference |
| PUT | `/me/password` | Change password |
| DELETE | `/me` | Delete the account and its data |
| GET | `/me/export` | Download all your data as JSON |
| GET | `/me/progress` | What you've done, for the profile |
| POST | `/me/quiz-result` | Save your quiz result |
| POST | `/password/forgot` | Ask for a reset link |
| POST | `/password/reset` | Set a new password with the link |

### Opportunities and applications

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/opportunities` | List opportunities |
| GET | `/opportunities/<id>` | One opportunity, its resources and your progress |
| POST | `/opportunities` | Add an opportunity (admin) |
| DELETE | `/opportunities/<id>` | Remove an opportunity (admin) |
| POST / DELETE | `/opportunities/<id>/save` | Save or unsave |
| GET | `/saved-opportunities` | Your saved opportunities |
| PUT | `/opportunities/<id>/progress` | Set your application stage and notes |
| GET | `/me/applications` | Everything you've saved or started, with its stage |
| POST | `/opportunities/<id>/files` | Upload a file for an application |
| GET / DELETE | `/files/<id>` | Download or delete that file |

### CV, guides and quiz

| Method | Endpoint | Purpose |
|---|---|---|
| GET / POST / DELETE | `/me/cv` | See, upload or delete your CV |
| GET | `/me/cv/file` | Download your CV |
| GET | `/guides/<file>` | Guide PDF (signed in) |
| POST | `/pathway-explainer` | Explains your quiz result |

### Interview practice

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/interview/questions?pathway=Digital&cv=1` | Five questions (`cv=1` adds one about your CV) |
| POST | `/interview/review-answer` | Feedback on one answer |
| POST | `/interview/follow-up` | A follow-up question |
| POST | `/interview/turn` | Works out if you're answering or talking to Alex |
| POST | `/interview/review` | Summary at the end (saved if signed in) |
| GET | `/interview/ai-status` | Is the AI working? |
| GET | `/me/interview-practice` | Your saved scores |
| DELETE | `/me/interview-practice/<id>` | Remove a saved score |

### Coffee chats

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/coffee-chats` | Ask for a coffee chat |
| GET | `/me/coffee-chats` | Your requests |
| POST | `/me/coffee-chats/<id>/cancel` | Cancel your request |
| GET | `/coffee-chats` | All requests (admin) |
| PUT | `/coffee-chats/<id>/status` | Set status (admin) |
| PUT | `/coffee-chats/<id>/details` | Set time and meeting link (admin) |

### Logbook

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/me/logbook` | Your goals, entries and total hours |
| POST | `/me/logbook/goals` | Add a goal |
| PUT / DELETE | `/me/logbook/goals/<id>` | Edit, tick off or delete a goal |
| POST | `/me/logbook/entries` | Add a weekly entry |
| PUT / DELETE | `/me/logbook/entries/<id>` | Edit or delete an entry |

### Question board and Ask Launchpad

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/board` | Approved posts, plus your own waiting posts |
| POST | `/board/questions` | Ask a question (signed in) |
| POST | `/board/questions/<id>/answers` | Answer a question (signed in) |
| POST | `/board/report` | Report a post (hides it until checked) |
| GET | `/admin/board` | Posts waiting to be checked (admin) |
| PUT | `/admin/board/<question or answer>/<id>` | Approve or reject (admin) |
| POST | `/assistant` | Ask Launchpad a question (not saved) |

### Interest, feedback and KPIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/interest` | Register interest |
| GET | `/interest` | All expressions of interest (admin) |
| POST | `/feedback` | "Was this page helpful?" |
| GET | `/admin/feedback` | All page feedback (admin) |
| GET | `/admin/kpis` | KPI dashboard numbers (admin) |

---

## Database

SQLite, set up from `backend/schema.sql`. The tables are:

| Table | What it stores |
|---|---|
| `users` | Accounts (password stored as a hash) |
| `expressions_of_interest` | Register interest form |
| `opportunities`, `resources` | Opportunities and their resources |
| `saved_opportunities`, `application_progress`, `application_files` | What each user saved, their stage and uploaded files |
| `user_cvs` | Uploaded CVs |
| `coffee_chat_requests` | Coffee chat requests |
| `interview_practice` | Saved interview practice scores |
| `password_resets` | Reset links (stored as a hash) |
| `page_feedback` | "Was this page helpful?" answers |
| `logbook_goals`, `logbook_entries` | Placement logbook |
| `board_questions`, `board_answers`, `board_reports` | Question board |

---

## Security

- Passwords are hashed with PBKDF2-SHA256 and never stored as plain text.
- Every database query is parameterised, which stops SQL injection.
- Sign-in cookies are HTTP-only, and secure when `LAUNCHPAD_SECURE_COOKIES=1`.
- Only the addresses in `LAUNCHPAD_ORIGINS` can call the API.
- Rate limits stop too many tries, for example signing in (10 per account every 15
  minutes) and password reset requests (5 every 15 minutes).
- Every input is checked on the server (length, format, allowed values).
- Uploads are limited to 10 MB and certain file types. CVs must be PDF, DOCX or TXT.
- Users can only see and change their own data. Admin pages are checked on the server.
- Reset links are random, stored as a hash, work once and expire after 30 minutes.
- The student's words are kept apart from the AI's instructions, so the AI can't be
  told to ignore them ("prompt injection").

**Not done in the prototype:** CSRF protection, sending real emails, and email
verification. These would be needed before going live, along with HTTPS.

---

## Privacy and safeguarding

Most users are aged 16 to 19, so:

- Consent is asked for when signing up, registering interest and booking a coffee chat.
  Coffee chats ask if the student is under 18 and if a parent or carer knows.
- Users can download or delete all their data in Settings (UK GDPR).
- Interview answers and Ask Launchpad questions are **not** saved. Only the scores are
  saved, and only if you're signed in.
- The AI runs on the same computer as the backend. Nothing is sent to an outside AI
  company. Contact details are taken out of a CV before the AI reads it.
- Question board posts are checked before they appear. Posts with emails, phone numbers,
  links, social media usernames or postcodes are blocked. Names show as first name and
  initial, and there are no private messages.
- If someone says they are unsafe, Alex, Ask Launchpad and the question board point
  them to a trusted adult, Childline (0800 1111) or 999.
- The Privacy, Terms and Staying safe pages explain all of this.

---

## Accessibility

From the accessibility button in the top bar, or in Settings:

- **Read this page aloud** (with pause and stop)
- Text size: small, medium or large
- High contrast and dark mode
- Colour-blind friendly colours
- Reduce motion
- Full-size page (turns off the 75% zoom used on large screens)

There's also a "Skip to main content" link and keyboard support. Ask Launchpad can read
its answers aloud, and interview practice works by voice or by typing.

---

## Known limits

- Opportunity listings are examples. Amazon UK apprenticeships for 2027 weren't listed
  when this was built.
- Some coffee chat details (roles, times and some bios) are placeholders.
- Interview and CV scores come from fixed rules, not a trained model.
- Voice input works best in Chrome or Edge.
- `launchpad.db`, `backend/uploads/` and `.env` are kept out of git. Back them up
  separately.

---

## Brand

Amazon Orange `#FF9900` and Amazon Dark Blue `#232F3E` are the main colours. The
Launchpad and Amazon logos must never be changed, rotated or recoloured.
