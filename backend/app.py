"""
Security notes (prototype level):
  - Passwords are hashed with werkzeug (PBKDF2); plain text is never stored.
  - All SQL uses parameterised queries, so there is no SQL injection risk.
  - Sessions use a signed cookie; CORS is limited to the dev frontend.
  - Rate limiting is in place (per IP address, and per account for sign in).
  - For production you would add: HTTPS, CSRF tokens, stronger session
    storage, and email verification.
"""

import hashlib
import io
import functools
import json
import re
import secrets
import time
from datetime import datetime, timedelta
import os
import sqlite3
import uuid

from flask import Flask, g, jsonify, request, session, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from cv_reviewer import extract_text, review_cv
from interview_coach import (
    SAFEGUARD_REPLY, assistant_reply, classify_turn, cv_question, faq_facts, follow_up, maybe_to_alex,
    question_info, question_set, reflect_answer, review_answer, review_interview, safety_concern, site_facts,
    small_talk_reply, spoken_feedback,
)
# Alex's words come from a local AI model (Ollama) when it's running; the
# scores always come from the rules above. See llm_coach.py and AI_SETUP.md.
from llm_coach import ai_assistant, ai_cv_question, pick_facts, reset_interviewer_name, set_interviewer_name, ai_feedback, ai_follow_up, ai_status, ai_summary, ai_turn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "launchpad.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
# Guide PDFs - only signed-in users can download them.
GUIDES_DIR = os.path.join(BASE_DIR, "guides")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Upload limits for the prototype.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB per file
ALLOWED_UPLOAD_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt",
    ".png", ".jpg", ".jpeg",
}

# Allowed pathways - kept in one place so validation is consistent.
PATHWAYS = {"Digital", "Business", "Media", "Finance", "Engineering"}

# Email check used on every form that takes an email (sign up, settings,
# register interest, coffee chats). It needs: something before the @, exactly
# one @, and a real-looking domain after it with a dot and an ending of at
# least 2 letters, e.g. name@school.ac.uk. It rejects "letter@", "@site.com",
# "a@b.", "a@@b.com", "a@b..com" and addresses with spaces.
EMAIL_RE = re.compile(
    r"^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
    r"@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$"
)


def valid_email(email):
    return bool(email) and len(email) <= 254 and len(email.split("@")[0]) <= 64 and EMAIL_RE.match(email) is not None
# Expression of interest: who's asking, and the extra pathway choices.
INTEREST_ROLES = {"student", "parent", "school"}
EXTRA_PATHWAY_CHOICES = {"Not sure yet", "Several pathways"}

app = Flask(__name__)
# In production, load this from an environment variable, never hard-code it.
app.secret_key = os.environ.get("LAUNCHPAD_SECRET", "dev-secret-change-me")
if app.secret_key == "dev-secret-change-me":
    print("WARNING: using the default LAUNCHPAD_SECRET. Set a long random value before going live.")
# Session cookie hardening. Set LAUNCHPAD_SECURE_COOKIES=1 once the site runs on HTTPS.
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("LAUNCHPAD_SECURE_COOKIES") == "1"
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES

# Allow the Vite dev server to call the API and send session cookies.
# Comma-separated list in LAUNCHPAD_ORIGINS for a live site, e.g. https://launchpad.example.com
ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("LAUNCHPAD_ORIGINS", "http://localhost:5173").split(",") if o.strip()
]
CORS(app, supports_credentials=True, origins=ALLOWED_ORIGINS)


# ---------- Simple rate limiting ----------
# In-memory, per IP address. Good enough for one server process; a live site
# with several processes should use a shared store (e.g. Redis) instead.
_hits = {}


def rate_limited(key, limit, window_seconds):
    """True if this IP has gone over `limit` requests for `key` in the window."""
    now = time.time()
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "?").split(",")[0].strip()
    bucket = [t for t in _hits.get((key, ip), []) if now - t < window_seconds]
    bucket.append(now)
    _hits[(key, ip)] = bucket
    return len(bucket) > limit


def too_many():
    return jsonify({"error": "Too many attempts. Please wait a few minutes and try again."}), 429


# ---------- Database helpers ----------

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create the tables if they do not exist yet."""
    db = sqlite3.connect(DB_PATH)
    with open(SCHEMA_PATH) as f:
        db.executescript(f.read())
    # Add newer user columns to databases created before they existed.
    cols = {r[1] for r in db.execute("PRAGMA table_info(users)").fetchall()}
    if "school" not in cols:
        db.execute("ALTER TABLE users ADD COLUMN school TEXT")
    if "email_updates" not in cols:
        db.execute("ALTER TABLE users ADD COLUMN email_updates INTEGER NOT NULL DEFAULT 1")
    if "role" not in cols:
        db.execute("ALTER TABLE users ADD COLUMN role TEXT")
    if "chat_host" not in cols:
        # Which coffee chat person this account belongs to (a name from MENTORS).
        # Set by an admin. Lets that person manage their own requests.
        db.execute("ALTER TABLE users ADD COLUMN chat_host TEXT")
    # Point the prep-guide resources at the downloadable PDFs.
    # Matched by title so older databases with any old link get fixed too.
    for title, new_url in (
        ("How to pass an assessment centre", "/guides/how-to-pass-an-assessment-centre.pdf"),
        ("Interview preparation tips", "/guides/interview-preparation-tips.pdf"),
        ("Writing a great application", "/guides/writing-a-great-application.pdf"),
    ):
        db.execute("UPDATE resources SET url = ?, kind = 'PDF guide' WHERE title = ?", (new_url, title))
    # Point opportunities at live Amazon job pages (applies to older databases too).
    for old_title, old_loc, title, loc, pathway, url, summary in (
        ('Software Development Engineer Apprentice', 'London', 'Software Development Engineer Apprentice', 'Cupertino, USA', 'Digital',
         'https://www.amazon.jobs/en/jobs/3188438/software-development-engineer-apprentice-military-veterans',
         'Learn to build software with Amazon engineers. This role is for military veterans.'),
        ('DevOps Engineer Apprentice', 'Manchester', 'Automation Engineer Apprentice', 'Daytona Beach, USA', 'Engineering',
         'https://www.amazon.jobs/en/jobs/10553762/automation-engineer-apprentice',
         'Learn to look after and improve the automated systems in an Amazon site.'),
        ('Digital Product Manager Apprentice', 'Leeds', 'Amazon Youth Apprenticeship Program', 'Cupertino, USA', 'Business',
         'https://www.amazon.jobs/en/jobs/10529804/amazon-youth-apprenticeship-program',
         'A paid apprenticeship for young people to learn how a business works.'),
        ('Digital Product Manager Apprentice', 'London', 'Graduate Automation Engineer Apprenticeship Program', 'Kojetin, Czech Republic', 'Engineering',
         'https://www.amazon.jobs/en/jobs/10578695/graduate-automation-engineer-apprenticeship-program',
         'Train as an automation engineer working with robotics and machines.'),
        ('Finance Apprentice', 'Edinburgh', 'Automation Engineer (work and study)', 'Kaiserslautern, Germany', 'Engineering',
         'https://www.amazon.jobs/en/jobs/10586445/duales-studium-automation-engineer',
         'Study for a degree while training as an automation engineer.'),
        ('RME Mechatronics Apprentice', 'Northern Ireland', 'Mechatronic Apprentice I', 'San Antonio, USA', 'Engineering',
         'https://www.amazon.jobs/en/jobs/10579284/mechatronic-apprentice-i',
         'Train to maintain and repair the robotics and machines in Amazon sites.'),
        ('OEM Engineering Apprentice', 'Birmingham', 'Mechatronic Apprentice I', 'San Antonio, USA', 'Engineering',
         'https://www.amazon.jobs/en/jobs/10579284/mechatronic-apprentice-i',
         'Train to maintain and repair the robotics and machines in Amazon sites.'),
    ):
        db.execute(
            "UPDATE opportunities SET title = ?, location = ?, pathway = ?, apply_url = ?, summary = ? "
            "WHERE title = ? AND location = ?",
            (title, loc, pathway, url, summary, old_title, old_loc),
        )
    if "quiz_pathway" not in cols:
        db.execute("ALTER TABLE users ADD COLUMN quiz_pathway TEXT")
    if "quiz_completed_at" not in cols:
        db.execute("ALTER TABLE users ADD COLUMN quiz_completed_at TEXT")
    # Newer coffee chat columns (confirmed time + meeting link).
    chat_cols = {r[1] for r in db.execute("PRAGMA table_info(coffee_chat_requests)").fetchall()}
    if "confirmed_time" not in chat_cols:
        db.execute("ALTER TABLE coffee_chat_requests ADD COLUMN confirmed_time TEXT")
    if "meeting_link" not in chat_cols:
        db.execute("ALTER TABLE coffee_chat_requests ADD COLUMN meeting_link TEXT")

    # Consent, customer type and safeguarding columns (added 28 Oct 2026).
    def add_col(table, col, decl):
        have = {r[1] for r in db.execute(f"PRAGMA table_info({table})").fetchall()}
        if col not in have:
            db.execute(f"ALTER TABLE {table} ADD COLUMN {col} {decl}")

    add_col("users", "consented_at", "TEXT")
    add_col("expressions_of_interest", "role", "TEXT NOT NULL DEFAULT 'student'")
    add_col("expressions_of_interest", "organisation", "TEXT")
    add_col("expressions_of_interest", "contact_role", "TEXT")
    add_col("expressions_of_interest", "consent_at", "TEXT")
    add_col("coffee_chat_requests", "under_18", "INTEGER")
    add_col("coffee_chat_requests", "guardian_aware", "INTEGER")
    add_col("coffee_chat_requests", "consent_at", "TEXT")
    db.commit()
    db.close()


def user_to_dict(row):
    keys = row.keys()
    return {
        "id": row["id"],
        "fullName": row["full_name"],
        "email": row["email"],
        "isAdmin": bool(row["is_admin"]),
        "school": row["school"] if "school" in keys else None,
        "emailUpdates": bool(row["email_updates"]) if "email_updates" in keys else True,
        "quizPathway": row["quiz_pathway"] if "quiz_pathway" in keys else None,
        "role": row["role"] if "role" in keys else None,
        "chatHost": row["chat_host"] if "chat_host" in keys else None,
    }


# Who the account is for. The site uses it to hide links a person doesn't need
# (e.g. a parent doesn't need the placement logbook). Older accounts may have none.
USER_ROLES = {"student", "teacher", "parent"}
ROLE_ERROR = "Please choose student, teacher or parent."


def current_user():
    """Return the logged-in user's row, or None."""
    user_id = session.get("user_id")
    if not user_id:
        return None
    db = get_db()
    return db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


# ---------- Auth routes ----------

@app.post("/api/signup")
def signup():
    # 30 per 15 minutes per address: a whole class on one school network can sign up.
    if rate_limited("signup", 30, 900):
        return too_many()
    data = request.get_json(silent=True) or {}
    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not full_name or not email or not password:
        return jsonify({"error": "All fields are required."}), 400
    if not valid_email(email):
        return jsonify({"error": "Please enter a valid email address."}), 400
    if len(full_name) > 120 or len(email) > 254:
        return jsonify({"error": "Your name or email is too long."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if data.get("consent") is not True:
        return jsonify({"error": "Please agree to the privacy notice and terms of use."}), 400
    role = data.get("role") or None
    if role is not None and role not in USER_ROLES:
        return jsonify({"error": ROLE_ERROR}), 400

    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        return jsonify({"error": "An account with that email already exists."}), 409

    # Use PBKDF2 explicitly: werkzeug's newer default (scrypt) needs a Python
    # built with scrypt support in hashlib, which is not always available.
    # PBKDF2 is always available and is a solid choice for a prototype.
    password_hash = generate_password_hash(password, method="pbkdf2:sha256")
    cur = db.execute(
        "INSERT INTO users (full_name, email, password_hash, role, consented_at) VALUES (?, ?, ?, ?, datetime('now'))",
        (full_name, email, password_hash, role),
    )
    db.commit()

    session["user_id"] = cur.lastrowid
    return jsonify({"user": {"id": cur.lastrowid, "fullName": full_name, "email": email, "isAdmin": False,
                             "role": role}}), 201


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    # 10 tries per account stops password guessing; the per-address limit is
    # higher so a class sharing one school network isn't locked out.
    if rate_limited("login:" + email, 10, 900) or rate_limited("login", 100, 900):
        return too_many()

    db = get_db()
    row = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row is None or not check_password_hash(row["password_hash"], password):
        # Same message either way, so we do not reveal which emails exist.
        return jsonify({"error": "Incorrect email or password."}), 401

    session["user_id"] = row["id"]
    return jsonify({"user": user_to_dict(row)})


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/me")
def me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"user": None})
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return jsonify({"user": user_to_dict(row) if row else None})


# ---------- Expression of interest ----------

@app.post("/api/interest")
def create_interest():
    if rate_limited("interest", 30, 3600):
        return too_many()
    data = request.get_json(silent=True) or {}
    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    school = (data.get("school") or "").strip()
    pathway = (data.get("pathway") or "").strip()
    message = (data.get("message") or "").strip()
    role = (data.get("role") or "student").strip()
    organisation = (data.get("organisation") or "").strip()
    contact_role = (data.get("contactRole") or "").strip()

    if role not in INTEREST_ROLES:
        return jsonify({"error": "Please tell us who you are."}), 400
    if not full_name or not email or not pathway:
        return jsonify({"error": "Name, email and pathway are required."}), 400
    if not valid_email(email):
        return jsonify({"error": "Please enter a valid email address."}), 400
    if pathway not in PATHWAYS and pathway not in EXTRA_PATHWAY_CHOICES:
        return jsonify({"error": "Please choose a valid pathway."}), 400
    if role == "school" and not organisation:
        return jsonify({"error": "Please add the name of your school or college."}), 400
    if data.get("consent") is not True:
        return jsonify({"error": "Please agree to the privacy notice so we can contact you."}), 400
    if max(len(full_name), len(organisation), len(contact_role), len(school)) > 160 or len(message) > 2000:
        return jsonify({"error": "Some of your answers are too long."}), 400

    db = get_db()
    db.execute(
        """INSERT INTO expressions_of_interest
           (user_id, full_name, email, school, pathway, message, role, organisation, contact_role, consent_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
        (session.get("user_id"), full_name, email, school, pathway, message,
         role, organisation or None, contact_role or None),
    )
    db.commit()
    return jsonify({"ok": True}), 201


@app.get("/api/interest")
def list_interest():
    """Admin view - list all expressions of interest.
    Requires a logged-in user whose account has is_admin set."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    if not user["is_admin"]:
        return jsonify({"error": "You do not have permission to view this."}), 403
    db = get_db()
    rows = db.execute(
        "SELECT * FROM expressions_of_interest ORDER BY created_at DESC"
    ).fetchall()
    items = [
        {
            "id": r["id"],
            "fullName": r["full_name"],
            "email": r["email"],
            "school": r["school"],
            "pathway": r["pathway"],
            "role": r["role"] if "role" in r.keys() else "student",
            "organisation": r["organisation"] if "organisation" in r.keys() else None,
            "contactRole": r["contact_role"] if "contact_role" in r.keys() else None,
            "message": r["message"],
            "createdAt": r["created_at"],
        }
        for r in rows
    ]
    return jsonify({"items": items, "count": len(items)})


# ---------- Coffee chats ----------

# People students can request a chat with. Keep in sync with
# src/modules/mentors.js on the frontend.
MENTORS = {
    "Bea Galang": ["Monday", "Wednesday"],
    "Michael Lawrence": ["Monday to Friday"],
    "Nahla Mitchell": ["Wednesday afternoon"],
    "Oliver Tappin": ["Thursday"],
    "Sarah Abwnawar": ["Friday morning"],
    "Tasniim Dirie": ["Monday afternoon", "Thursday afternoon"],
}
# Status a coffee chat request can be in (admins move it along).
CHAT_STATUSES = ["Requested", "Confirmed", "Completed", "Cancelled"]

CHAT_TOPICS = {
    "Choosing a pathway", "What a placement is like", "Applying and interviews",
    "Apprenticeships after T Levels", "Something else",
}


def coffee_chat_to_dict(r):
    return {
        "id": r["id"],
        "mentor": r["mentor"],
        "fullName": r["full_name"],
        "email": r["email"],
        "preferredTime": r["preferred_time"],
        "topic": r["topic"],
        "message": r["message"],
        "status": r["status"],
        "createdAt": r["created_at"],
        "confirmedTime": r["confirmed_time"] if "confirmed_time" in r.keys() else None,
        "meetingLink": r["meeting_link"] if "meeting_link" in r.keys() else None,
        "under18": bool(r["under_18"]) if "under_18" in r.keys() and r["under_18"] is not None else None,
        "guardianAware": bool(r["guardian_aware"]) if "guardian_aware" in r.keys() and r["guardian_aware"] is not None else None,
    }


@app.post("/api/coffee-chats")
def create_coffee_chat():
    """Request a coffee chat. Works signed in or out."""
    if rate_limited("coffee-chat", 20, 3600):
        return too_many()
    data = request.get_json(silent=True) or {}
    mentor = (data.get("mentor") or "").strip()
    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    preferred_time = (data.get("preferredTime") or "").strip()
    topic = (data.get("topic") or "").strip()
    message = (data.get("message") or "").strip()

    if mentor not in MENTORS:
        return jsonify({"error": "Please choose someone to chat with."}), 400
    if not full_name or not email or not preferred_time:
        return jsonify({"error": "Name, email and a preferred time are required."}), 400
    if not valid_email(email):
        return jsonify({"error": "Please enter a valid email address."}), 400
    if preferred_time not in MENTORS[mentor]:
        return jsonify({"error": "Please choose one of the available times."}), 400
    if topic and topic not in CHAT_TOPICS:
        return jsonify({"error": "Please choose a valid topic."}), 400
    if len(full_name) > 120 or len(message) > 1000:
        return jsonify({"error": "Your name or message is too long."}), 400
    age_group = (data.get("ageGroup") or "").strip()
    if age_group not in ("18+", "under18"):
        return jsonify({"error": "Please tell us if you're under 18."}), 400
    under_18 = age_group == "under18"
    if under_18 and data.get("guardianAware") is not True:
        return jsonify({"error": "If you're under 18, please check a parent or carer knows about the chat."}), 400
    if data.get("consent") is not True:
        return jsonify({"error": "Please agree to the privacy notice and the staying safe guidance."}), 400

    db = get_db()
    cur = db.execute(
        """INSERT INTO coffee_chat_requests
           (user_id, mentor, full_name, email, preferred_time, topic, message,
            under_18, guardian_aware, consent_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
        (session.get("user_id"), mentor, full_name, email, preferred_time, topic, message,
         1 if under_18 else 0, 1 if under_18 else None),
    )
    db.commit()
    row = db.execute("SELECT * FROM coffee_chat_requests WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify({"ok": True, "request": coffee_chat_to_dict(row)}), 201


@app.get("/api/me/coffee-chats")
def my_coffee_chats():
    """The signed-in user's own coffee chat requests."""
    user = current_user()
    if user is None:
        return jsonify({"items": []})
    rows = get_db().execute(
        "SELECT * FROM coffee_chat_requests WHERE user_id = ? ORDER BY created_at DESC, id DESC",
        (user["id"],),
    ).fetchall()
    return jsonify({"items": [coffee_chat_to_dict(r) for r in rows]})


@app.get("/api/coffee-chats")
def list_coffee_chats():
    """Admin view - all coffee chat requests."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    if not user["is_admin"]:
        return jsonify({"error": "You do not have permission to view this."}), 403
    rows = get_db().execute(
        "SELECT * FROM coffee_chat_requests ORDER BY created_at DESC, id DESC"
    ).fetchall()
    items = [coffee_chat_to_dict(r) for r in rows]
    return jsonify({"items": items, "count": len(items)})


@app.put("/api/coffee-chats/<int:chat_id>/status")
def update_coffee_chat_status(chat_id):
    """Admin only - change the status of a coffee chat request."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    if not user["is_admin"]:
        return jsonify({"error": "You do not have permission to do this."}), 403
    return _apply_chat_status(chat_id)


def _find_chat(db, chat_id, mentor=None):
    """A coffee chat request by id. With `mentor`, only if it is that person's."""
    if mentor is None:
        return db.execute("SELECT * FROM coffee_chat_requests WHERE id = ?", (chat_id,)).fetchone()
    return db.execute(
        "SELECT * FROM coffee_chat_requests WHERE id = ? AND mentor = ?", (chat_id, mentor)
    ).fetchone()


def _apply_chat_status(chat_id, mentor=None, to_dict=None):
    """Change a request's status. Used by admins (any request) and hosts (their own)."""
    to_dict = to_dict or coffee_chat_to_dict
    data = request.get_json(silent=True) or {}
    status = (data.get("status") or "").strip()
    if status not in CHAT_STATUSES:
        return jsonify({"error": "Please choose a valid status."}), 400
    db = get_db()
    if _find_chat(db, chat_id, mentor) is None:
        return jsonify({"error": "Request not found."}), 404
    db.execute("UPDATE coffee_chat_requests SET status = ? WHERE id = ?", (status, chat_id))
    db.commit()
    return jsonify({"ok": True, "request": to_dict(_find_chat(db, chat_id))})


def _apply_chat_details(chat_id, mentor=None, to_dict=None):
    """Set the confirmed date/time and meeting link. Empty strings clear them.
    Saving a time on a request that is still 'Requested' moves it to 'Confirmed'."""
    to_dict = to_dict or coffee_chat_to_dict
    data = request.get_json(silent=True) or {}
    confirmed_time = (data.get("confirmedTime") or "").strip()
    meeting_link = (data.get("meetingLink") or "").strip()

    if confirmed_time:
        try:
            # From an <input type="datetime-local">, e.g. 2026-11-03T15:30
            datetime.fromisoformat(confirmed_time)
        except ValueError:
            return jsonify({"error": "Please choose a valid date and time."}), 400
    if meeting_link and (not meeting_link.startswith("https://") or len(meeting_link) > 500 or " " in meeting_link):
        return jsonify({"error": "The meeting link must be a full https:// address."}), 400

    db = get_db()
    row = _find_chat(db, chat_id, mentor)
    if row is None:
        return jsonify({"error": "Request not found."}), 404
    status = row["status"]
    if confirmed_time and status == "Requested":
        status = "Confirmed"
    db.execute(
        "UPDATE coffee_chat_requests SET confirmed_time = ?, meeting_link = ?, status = ? WHERE id = ?",
        (confirmed_time or None, meeting_link or None, status, chat_id),
    )
    db.commit()
    return jsonify({"ok": True, "request": to_dict(_find_chat(db, chat_id))})


@app.put("/api/coffee-chats/<int:chat_id>/details")
def update_coffee_chat_details(chat_id):
    """Admin only - set the confirmed date/time and meeting link.
    Send empty strings to clear them. Saving a time on a request that is
    still 'Requested' moves it to 'Confirmed'."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    if not user["is_admin"]:
        return jsonify({"error": "You do not have permission to do this."}), 403
    return _apply_chat_details(chat_id)


@app.post("/api/me/coffee-chats/<int:chat_id>/cancel")
def cancel_my_coffee_chat(chat_id):
    """A student cancels their own request while it is still waiting."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    db = get_db()
    row = db.execute(
        "SELECT * FROM coffee_chat_requests WHERE id = ? AND user_id = ?",
        (chat_id, user["id"]),
    ).fetchone()
    if row is None:
        return jsonify({"error": "Request not found."}), 404
    if row["status"] != "Requested":
        return jsonify({"error": "Only requests that are still waiting can be cancelled."}), 400
    db.execute("UPDATE coffee_chat_requests SET status = 'Cancelled' WHERE id = ?", (chat_id,))
    db.commit()
    row = db.execute("SELECT * FROM coffee_chat_requests WHERE id = ?", (chat_id,)).fetchone()
    return jsonify({"ok": True, "request": coffee_chat_to_dict(row)})


# ---------- Coffee chat hosts ----------
# The people students book coffee chats with (MENTORS). An admin links each
# person to their Launchpad account (users.chat_host). That person can then
# manage their OWN requests on /alumni/coffee-chats/manage. They are not
# admins: they can't see anyone else's requests or any admin page.

def require_host():
    """Return (user, host name, None) for a signed-in host, or (None, None, error)."""
    user = current_user()
    if user is None:
        return None, None, (jsonify({"error": "You must be signed in."}), 401)
    host = user["chat_host"] if "chat_host" in user.keys() else None
    if not host or host not in MENTORS:
        return None, None, (jsonify({"error": "This page is only for coffee chat hosts."}), 403)
    return user, host, None


def host_chat_to_dict(r):
    """What a host sees. Students who were signed in see the time and link in
    their own account, so the host doesn't get their email. For requests sent
    while signed out, the email is kept so the host can reply."""
    d = coffee_chat_to_dict(r)
    linked = r["user_id"] is not None
    d["linkedAccount"] = linked
    if linked:
        d["email"] = None
    return d


@app.get("/api/host/coffee-chats")
def host_coffee_chats():
    _, host, err = require_host()
    if err:
        return err
    rows = get_db().execute(
        "SELECT * FROM coffee_chat_requests WHERE mentor = ? ORDER BY created_at DESC, id DESC", (host,)
    ).fetchall()
    items = [host_chat_to_dict(r) for r in rows]
    return jsonify({"host": host, "items": items, "count": len(items)})


@app.put("/api/host/coffee-chats/<int:chat_id>/status")
def host_update_chat_status(chat_id):
    _, host, err = require_host()
    if err:
        return err
    return _apply_chat_status(chat_id, mentor=host, to_dict=host_chat_to_dict)


@app.put("/api/host/coffee-chats/<int:chat_id>/details")
def host_update_chat_details(chat_id):
    _, host, err = require_host()
    if err:
        return err
    return _apply_chat_details(chat_id, mentor=host, to_dict=host_chat_to_dict)


def _chat_hosts(db):
    rows = db.execute("SELECT full_name, email, chat_host FROM users WHERE chat_host IS NOT NULL").fetchall()
    by_host = {r["chat_host"]: r for r in rows}
    return [{
        "mentor": name,
        "email": by_host[name]["email"] if name in by_host else None,
        "accountName": by_host[name]["full_name"] if name in by_host else None,
    } for name in MENTORS]


@app.get("/api/admin/chat-hosts")
def admin_chat_hosts():
    """Admin only - which account manages each person's coffee chats."""
    _, err = require_admin()
    if err:
        return err
    return jsonify({"items": _chat_hosts(get_db())})


@app.put("/api/admin/chat-hosts")
def admin_set_chat_host():
    """Admin only - link a coffee chat person to an account by its email.
    An empty email removes the link. Each person has at most one account."""
    _, err = require_admin()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    mentor = (data.get("mentor") or "").strip()
    email = (data.get("email") or "").strip().lower()
    if mentor not in MENTORS:
        return jsonify({"error": "Please choose someone from the coffee chats list."}), 400
    db = get_db()
    account = None
    if email:
        account = db.execute("SELECT id FROM users WHERE lower(email) = ?", (email,)).fetchone()
        if account is None:
            return jsonify({"error": "No account uses that email. Ask them to create an account first."}), 404
    db.execute("UPDATE users SET chat_host = NULL WHERE chat_host = ?", (mentor,))
    if account is not None:
        db.execute("UPDATE users SET chat_host = ? WHERE id = ?", (mentor, account["id"]))
    db.commit()
    return jsonify({"ok": True, "items": _chat_hosts(db)})


# ---------- Interview practice ----------

def role_context(pathway):
    """One sentence about the role, from the same text as the career quiz."""
    p = PATHWAY_PROFILES.get(pathway)
    if not p:
        return ""
    return (f"On a {pathway} T Level you study {p['study']}, and it can lead to roles like a {p['roles']}. "
            f"The pathway suits people who enjoy {p['strengths']}.")


def interview_history(data):
    """Earlier questions and answers in this call (sent by the page, not stored)."""
    out = []
    raw = data.get("history")
    if isinstance(raw, list):
        for h in raw[-3:]:
            if isinstance(h, dict):
                q = " ".join(str(h.get("q") or "").split())[:300]
                a = " ".join(str(h.get("a") or "").split())[:1200]
                if q and a:
                    out.append({"q": q, "a": a})
    return out


def interview_pathway(data):
    p = str(data.get("pathway") or "").strip()
    return p if p in PATHWAYS else None


# ---------- Alex or Peccy ----------
# The student picks who runs the practice call. The questions, scores and
# feedback are the same; the AI is told who it is, and the name in every
# reply is swapped (the rule-based replies are written with "Alex").
INTERVIEWER_NAMES = {"alex": "Alex", "peccy": "Peccy"}


def _with_name(obj, name):
    if isinstance(obj, str):
        return re.sub(r"\bAlex\b", name, obj)
    if isinstance(obj, list):
        return [_with_name(x, name) for x in obj]
    if isinstance(obj, dict):
        return {k: _with_name(v, name) for k, v in obj.items()}
    return obj


def as_interviewer(view):
    """Run an interview route as the chosen interviewer (?interviewer= or "interviewer" in the body)."""
    @functools.wraps(view)
    def wrapper(*args, **kwargs):
        data = request.get_json(silent=True)
        raw = data.get("interviewer") if isinstance(data, dict) else None
        raw = raw or request.args.get("interviewer")
        name = INTERVIEWER_NAMES.get(str(raw or "").strip().lower(), "Alex")
        token = set_interviewer_name(name)
        try:
            out = view(*args, **kwargs)
        finally:
            reset_interviewer_name(token)
        if name == "Alex":
            return out
        resp, rest = (out[0], out[1:]) if isinstance(out, tuple) else (out, ())
        payload = resp.get_json(silent=True) if hasattr(resp, "get_json") else getattr(resp, "data", None)
        if not isinstance(payload, (dict, list)):
            return out
        renamed = jsonify(_with_name(payload, name))
        return (renamed, *rest) if rest else renamed
    return wrapper


@app.get("/api/interview/questions")
@as_interviewer
def interview_questions():
    """Five practice questions for a pathway (?pathway=Digital)."""
    pathway = (request.args.get("pathway") or "").strip()
    pathway = pathway if pathway in PATHWAYS else "Digital"
    questions = question_set(pathway)
    cv_used = False
    # "Ask me about my CV": swap one question for one about the student's own CV.
    # The CV is read here and (if the AI is on) sent to the local model only. Nothing is saved.
    if request.args.get("cv") == "1":
        text = _my_cv_text()
        if text:
            asked = ai_cv_question(text, pathway) or cv_question(text) or question_info("cv")["text"]
            cv_q = {"id": "cv", "text": asked, "focus": question_info("cv")["focus"]}
            questions = [cv_q if q["id"] == "problem" else q for q in questions]
            cv_used = True
    return jsonify({"pathway": pathway, "questions": questions, "context": role_context(pathway),
                    "cvUsed": cv_used})


def _my_cv_text():
    """Text of the signed-in user's CV, or "" if there isn't one."""
    user = current_user()
    if user is None:
        return ""
    row = get_db().execute("SELECT stored_name FROM user_cvs WHERE user_id = ?", (user["id"],)).fetchone()
    if row is None:
        return ""
    path = os.path.join(UPLOAD_DIR, row["stored_name"])
    try:
        return extract_text(path, os.path.splitext(row["stored_name"])[1].lower()) or ""
    except Exception:
        return ""


def _asked_info(qid, data):
    """Question text and focus. For the CV question, the page sends the text it was asked."""
    info = question_info(qid)
    asked = " ".join(str(data.get("asked") or "").split())[:300]
    if info and qid == "cv" and asked:
        info = {**info, "text": asked}
    return info


def _interruptions(value):
    """How many times the student talked over the interviewer (0 to 10)."""
    try:
        return max(0, min(10, int(value or 0)))
    except (TypeError, ValueError):
        return 0


@app.post("/api/interview/review-answer")
@as_interviewer
def interview_review_answer():
    """Quick feedback on one answer, straight after it's given. Not stored."""
    if rate_limited("interview-answer", 200, 3600):
        return too_many()
    data = request.get_json(silent=True) or {}
    seconds = data.get("seconds")
    try:
        seconds = float(seconds) if seconds is not None else None
    except (TypeError, ValueError):
        seconds = None
    qid = str(data.get("id") or "")[:40]
    main = str(data.get("answer") or "")[:4000]
    fu = data.get("followUp") if isinstance(data.get("followUp"), dict) else {}
    follow_answer = str(fu.get("answer") or "")[:4000]
    follow_asked = bool(data.get("followUpAsked"))

    # The follow-up answer counts towards the score for this question.
    combined = f"{main} {follow_answer}".strip()
    interruptions = _interruptions(data.get("interruptions"))
    asked_text = (_asked_info(qid, data) or {}).get("text")
    review = review_answer(qid, combined, seconds, interruptions, asked_text)
    if review is None:
        return jsonify({"error": "That question wasn't recognised."}), 400
    first = review_answer(qid, main, None, interruptions, asked_text) if follow_answer.strip() else None
    review["scoreBefore"] = first["score"] if first else None
    # Alex already repeated back the first answer before his follow-up.
    reflect_on = follow_answer if follow_answer.strip() else ("" if follow_asked else None)
    review["say"] = spoken_feedback(review, reflect_on=reflect_on)
    review["source"] = "rules"
    info = _asked_info(qid, data)
    review["question"] = info["text"]
    # Alex's reply in his own words, if the AI is running. The score above doesn't change.
    pathway = interview_pathway(data)
    # noAi: the page has its own scripted line for this, so don't wait for the AI.
    ai_say = None if data.get("noAi") else ai_feedback(
        info, qid, main, review,
        follow_question=str(fu.get("question") or "")[:300] or None,
        follow_answer=follow_answer,
        pathway=pathway, history=interview_history(data), context=role_context(pathway),
    )
    if ai_say:
        review["say"] = ai_say
        review["source"] = "ai"
    return jsonify(review)


@app.post("/api/interview/follow-up")
@as_interviewer
def interview_follow_up():
    """After a first answer: a follow-up question if something is missing. Not stored."""
    if rate_limited("interview-answer", 200, 3600):
        return too_many()
    data = request.get_json(silent=True) or {}
    qid = str(data.get("id") or "")[:40]
    answer = str(data.get("answer") or "")[:4000]
    # Something to avoid in a real interview (swearing, blaming others, only
    # wanting the money...): no follow-up, go straight to the feedback that says so.
    first_look = review_answer(qid, answer, asked=(_asked_info(qid, data) or {}).get("text"))
    if first_look and first_look.get("warning"):
        return jsonify({"followUp": None, "say": None, "source": "rules"})
    # The rules decide WHETHER to ask a follow-up (and what's missing)...
    question = follow_up(qid, answer)
    say = reflect_answer(qid, answer) if question else None
    source = "rules"
    pathway = interview_pathway(data)
    # Earlier answers aren't sent: the small model kept asking about them
    # instead of the answer it was given.
    history = None
    context = role_context(pathway)
    if question:
        # Something is missing (no example, no result, only "we"...): Alex asks the
        # rules' follow-up, which always asks for exactly that. In testing, the AI
        # often asked about something else ("What made you drop your phone?") or
        # quoted the student back ("what did you mean by 'some of the slides'?").
        pass
    elif qid != "close" and len(answer.split()) >= 12:
        # Nothing missing - with the AI on, Alex digs deeper, like a real interviewer.
        ai = ai_follow_up(_asked_info(qid, data), qid, answer, None, pathway, history, context)
        if ai:
            question = {"text": ai["text"], "why": ai["why"] or "To hear a bit more about your example."}
            say = ai["say"]
            source = "ai"
    return jsonify({"followUp": question, "say": say, "source": source})


@app.post("/api/interview/turn")
@as_interviewer
def interview_turn():
    """Something the student said that might not be an answer, e.g. a question
    for Alex ("What is the apprenticeship?") or "Can you repeat that?".
    Works out what they're doing and what Alex says back. Not stored."""
    if rate_limited("interview-answer", 200, 3600):
        return too_many()
    data = request.get_json(silent=True) or {}
    qid = str(data.get("id") or "")[:40]
    asked = " ".join(str(data.get("asked") or "").split())[:300]
    utterance = str(data.get("utterance") or "")[:1000]
    context = "feedback" if data.get("context") == "feedback" else "answering"
    pathway = str(data.get("pathway") or "").strip()
    pathway = pathway if pathway in PATHWAYS else None
    tip = " ".join(str(data.get("tip") or "").split())[:300] or None
    info = question_info(qid)
    if info is None:
        return jsonify({"error": "That question wasn't recognised."}), 400
    asked = asked or info["text"]

    rules = classify_turn(qid, utterance, context, asked=asked, pathway=pathway, tip=tip)
    fixed = rules.pop("fixed", False)
    result = {**rules, "source": "rules"}
    # Safety replies, repeats, small talk and the closing question never go to the AI.
    if fixed or rules["type"] in ("safeguard", "repeat") or (context == "answering" and qid == "close"):
        return jsonify(result)
    # A real answer goes straight through. The AI only takes a second look at
    # short replies that might be aimed at Alex ("what do you mean?").
    if context == "answering" and rules["type"] == "answer" and not maybe_to_alex(utterance):
        return jsonify(result)
    # "I'm stuck", "what do you mean?" and "skip" have clear, tested replies.
    # The AI kept turning these into "Can you tell me what you mean by...?".
    if rules["type"] in ("stuck", "clarify", "skip"):
        return jsonify(result)
    ai = ai_turn(asked, info, qid, utterance, context, faq_facts(), pathway, tip, role_context(pathway))
    if ai:
        if ai["type"] == "repeat" and context == "answering":
            return jsonify({"type": "repeat", "say": f"Sure. {asked}", "source": "ai"})
        # The AI can answer a question the student asked Alex in its own words...
        if ai["type"] == "question" and ai["say"]:
            return jsonify({"type": "question", "say": ai["say"], "source": "ai"})
        # ...or reply to something after the feedback. Otherwise the rules decide.
        if context == "feedback" and rules["type"] == "other" and ai["type"] == "other" and ai["say"]:
            return jsonify({"type": "other", "say": ai["say"], "source": "ai"})
    return jsonify(result)


@app.get("/api/interview/ai-status")
def interview_ai_status():
    """Is Alex's AI running and working? Also loads the model so the first reply is quick."""
    # Green only once the model has really replied; this also starts a test reply if needed.
    return jsonify(ai_status(refresh=request.args.get("refresh") == "1"))


@app.post("/api/interview/review")
@as_interviewer
def interview_review():
    """Feedback on a practice interview. Answers are checked locally and not stored;
    for signed-in users the scores are saved to their profile."""
    if rate_limited("interview", 60, 3600):
        return too_many()
    data = request.get_json(silent=True) or {}
    answers = data.get("answers")
    if not isinstance(answers, list) or not answers or len(answers) > 10:
        return jsonify({"error": "No answers were sent."}), 400
    clean = []
    for a in answers:
        if not isinstance(a, dict):
            continue
        seconds = a.get("seconds")
        try:
            seconds = float(seconds) if seconds is not None else None
        except (TypeError, ValueError):
            seconds = None
        clean.append({"id": str(a.get("id") or "")[:40],
                      "answer": str(a.get("answer") or "")[:4000],
                      "seconds": seconds,
                      "interruptions": _interruptions(a.get("interruptions")),
                      "asked": " ".join(str(a.get("asked") or "").split())[:300]})
    result = review_interview(clean)
    if result is None:
        return jsonify({"error": "Those questions weren't recognised."}), 400
    cv_asked = next((a["asked"] for a in clean if a["id"] == "cv" and a["asked"]), None)
    if cv_asked:
        for r in result["reviews"]:
            if r["id"] == "cv":
                r["question"] = cv_asked
        best = max(result["reviews"], key=lambda r: r["score"])
        result["bestQuestion"] = best["question"] if best["score"] >= 60 else None
    # A short summary in Alex's words, if the AI is running (not saved).
    pathway = interview_pathway(data)
    result["coachSummary"] = None if data.get("noAi") else ai_summary(result, pathway, role_context(pathway))

    # Signed in: keep the scores (not the answers) so progress shows on the profile.
    result["saved"] = False
    user = current_user()
    if user is not None:
        pathway = (data.get("pathway") or "").strip()
        if pathway not in PATHWAYS:
            pathway = "Digital"
        scores = [{"id": r["id"], "question": r["question"], "score": r["score"]} for r in result["reviews"]]
        db = get_db()
        cur = db.execute(
            """INSERT INTO interview_practice (user_id, pathway, overall, question_scores, focus_on)
               VALUES (?, ?, ?, ?, ?)""",
            (user["id"], pathway, int(result["overall"]), json.dumps(scores), json.dumps(result["focusOn"])),
        )
        db.commit()
        result["saved"] = True
        result["practiceId"] = cur.lastrowid
    return jsonify(result)


def practice_to_dict(r):
    try:
        scores = json.loads(r["question_scores"] or "[]")
    except ValueError:
        scores = []
    try:
        focus = json.loads(r["focus_on"] or "[]")
    except ValueError:
        focus = []
    return {
        "id": r["id"],
        "pathway": r["pathway"],
        "overall": r["overall"],
        "questions": scores,
        "focusOn": focus,
        "createdAt": r["created_at"],
    }


@app.get("/api/me/interview-practice")
def my_interview_practice():
    """The signed-in user's practice interview scores, newest first."""
    user = current_user()
    if user is None:
        return jsonify({"items": []})
    rows = get_db().execute(
        "SELECT * FROM interview_practice WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50",
        (user["id"],),
    ).fetchall()
    return jsonify({"items": [practice_to_dict(r) for r in rows]})


@app.delete("/api/me/interview-practice/<int:practice_id>")
def delete_interview_practice(practice_id):
    """Remove one saved practice result."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    db = get_db()
    cur = db.execute(
        "DELETE FROM interview_practice WHERE id = ? AND user_id = ?", (practice_id, user["id"])
    )
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Result not found."}), 404
    return jsonify({"ok": True})


# ---------- Forgot password ----------
# The prototype has no email service, so the reset link is printed in the
# terminal running this server. A live site would email it instead.
RESET_MINUTES = 30


def _hash_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@app.post("/api/password/forgot")
def forgot_password():
    if rate_limited("forgot", 5, 900):
        return too_many()
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    # Same reply whether or not the account exists, so this can't be used to
    # find out who has an account.
    reply = jsonify({"ok": True})
    if not email:
        return reply
    db = get_db()
    user = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if user is None:
        return reply
    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(minutes=RESET_MINUTES)).strftime("%Y-%m-%d %H:%M:%S")
    db.execute("DELETE FROM password_resets WHERE user_id = ?", (user["id"],))
    db.execute(
        "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (user["id"], _hash_token(token), expires),
    )
    db.commit()
    site = ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else "http://localhost:5173"
    print(f"\n[Launchpad] Password reset link for {email} (valid {RESET_MINUTES} minutes):\n"
          f"  {site}/reset-password?token={token}\n", flush=True)
    return reply


@app.post("/api/password/reset")
def reset_password():
    if rate_limited("reset", 10, 900):
        return too_many()
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    new = data.get("password") or ""
    if len(new) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    db = get_db()
    row = db.execute(
        "SELECT * FROM password_resets WHERE token_hash = ? AND used = 0", (_hash_token(token),)
    ).fetchone() if token else None
    if row is None or row["expires_at"] < datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"):
        return jsonify({"error": "This reset link has expired or already been used. Please ask for a new one."}), 400
    db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (generate_password_hash(new, method="pbkdf2:sha256"), row["user_id"]),
    )
    db.execute("UPDATE password_resets SET used = 1 WHERE id = ?", (row["id"],))
    db.commit()
    return jsonify({"ok": True})


# ---------- Members-only downloads ----------

@app.get("/api/guides/<path:filename>")
def guide_pdf(filename):
    """Guide PDFs are for signed-in users only."""
    if current_user() is None:
        return jsonify({"error": "Please sign in to download this guide."}), 401
    name = secure_filename(filename)
    if not name.endswith(".pdf") or not os.path.isfile(os.path.join(GUIDES_DIR, name)):
        return jsonify({"error": "Guide not found."}), 404
    return send_from_directory(GUIDES_DIR, name, as_attachment=True)


# ---------- Page feedback ("Was this page helpful?") ----------
# Anonymous: no name, email or account is stored with it.

@app.post("/api/feedback")
def create_feedback():
    if rate_limited("feedback", 30, 3600):
        return too_many()
    data = request.get_json(silent=True) or {}
    page = (data.get("page") or "").strip()[:200]
    helpful = data.get("helpful")
    comment = (data.get("comment") or "").strip()
    if not page.startswith("/") or not isinstance(helpful, bool):
        return jsonify({"error": "Please choose yes or no."}), 400
    if len(comment) > 500:
        return jsonify({"error": "Please keep your comment under 500 characters."}), 400
    db = get_db()
    db.execute(
        "INSERT INTO page_feedback (page, helpful, comment) VALUES (?, ?, ?)",
        (page, 1 if helpful else 0, comment or None),
    )
    db.commit()
    return jsonify({"ok": True}), 201


def require_admin():
    user = current_user()
    if user is None:
        return None, (jsonify({"error": "You must be signed in."}), 401)
    if not user["is_admin"]:
        return None, (jsonify({"error": "You do not have permission to view this."}), 403)
    return user, None


def _database_copy():
    """A safe copy of the whole database, as bytes, for an admin to download.

    Made with SQLite's VACUUM INTO, so it's a complete, consistent copy even
    while the site is in use. Passwords (stored scrambled) and password reset
    codes are removed from the COPY only, then VACUUM rewrites the file so the
    removed values aren't left behind in empty space. The live database is
    not changed."""
    tmp = os.path.join(os.path.dirname(DB_PATH), f".export-{secrets.token_hex(8)}.db")
    try:
        src = sqlite3.connect(DB_PATH)
        try:
            src.execute("VACUUM INTO ?", (tmp,))
        finally:
            src.close()
        dst = sqlite3.connect(tmp)
        try:
            dst.execute("UPDATE users SET password_hash = ''")
            dst.execute("DELETE FROM password_resets")
            dst.commit()
            dst.execute("VACUUM")
        finally:
            dst.close()
        with open(tmp, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


@app.get("/api/admin/database")
def download_database():
    """Admin only - download a copy of the database (passwords removed)."""
    _, err = require_admin()
    if err:
        return err
    if rate_limited("db-export", 10, 3600):
        return too_many()
    data = _database_copy()
    name = f"launchpad-database-{datetime.utcnow().strftime('%Y-%m-%d')}.db"
    resp = send_file(io.BytesIO(data), mimetype="application/vnd.sqlite3", as_attachment=True, download_name=name)
    resp.headers["Cache-Control"] = "no-store"
    return resp


@app.get("/api/admin/feedback")
def list_feedback():
    _, err = require_admin()
    if err:
        return err
    rows = get_db().execute("SELECT * FROM page_feedback ORDER BY created_at DESC, id DESC").fetchall()
    items = [{"id": r["id"], "page": r["page"], "helpful": bool(r["helpful"]),
              "comment": r["comment"], "createdAt": r["created_at"]} for r in rows]
    return jsonify({"items": items, "count": len(items)})


# ---------- KPI dashboard ----------

@app.get("/api/admin/kpis")
def admin_kpis():
    """Headline numbers for the admin dashboard (the project's KPIs)."""
    _, err = require_admin()
    if err:
        return err
    db = get_db()

    def one(sql, args=()):
        row = db.execute(sql, args).fetchone()
        return row[0] if row and row[0] is not None else 0

    def grouped(sql):
        return {str(r[0]): r[1] for r in db.execute(sql).fetchall() if r[0] is not None}

    week = "datetime('now', '-7 days')"
    month = "datetime('now', '-30 days')"
    feedback_total = one("SELECT COUNT(*) FROM page_feedback")
    feedback_yes = one("SELECT COUNT(*) FROM page_feedback WHERE helpful = 1")
    most_saved = [
        {"title": r["title"], "count": r["n"]}
        for r in db.execute(
            """SELECT o.title, COUNT(*) AS n FROM saved_opportunities s
               JOIN opportunities o ON o.id = s.opportunity_id
               GROUP BY o.id ORDER BY n DESC, o.title LIMIT 5"""
        ).fetchall()
    ]
    # Daily counts for the last 14 days (oldest first), for the activity chart
    # and the small trend lines. Dates are UTC, like created_at.
    days = [(datetime.utcnow().date() - timedelta(days=n)).isoformat() for n in range(13, -1, -1)]

    def daily(table):
        rows = db.execute(f"SELECT date(created_at) AS d, COUNT(*) AS n FROM {table} "
                          "WHERE date(created_at) >= ? GROUP BY d", (days[0],)).fetchall()
        got = {r["d"]: r["n"] for r in rows}
        return [got.get(d, 0) for d in days]

    bands = db.execute("""SELECT SUM(overall < 40), SUM(overall >= 40 AND overall < 70), SUM(overall >= 70)
                          FROM interview_practice""").fetchone()
    worst_pages = [
        {"page": r["page"], "yes": r["yes"], "total": r["total"]}
        for r in db.execute(
            """SELECT page, SUM(helpful) AS yes, COUNT(*) AS total FROM page_feedback
               GROUP BY page HAVING total >= 1
               ORDER BY (1.0 * SUM(helpful) / COUNT(*)) ASC, total DESC LIMIT 5"""
        ).fetchall()
    ]
    return jsonify({
        "users": {
            "total": one("SELECT COUNT(*) FROM users"),
            "last7": one(f"SELECT COUNT(*) FROM users WHERE created_at >= {week}"),
            "last30": one(f"SELECT COUNT(*) FROM users WHERE created_at >= {month}"),
        },
        "interest": {
            "total": one("SELECT COUNT(*) FROM expressions_of_interest"),
            "last30": one(f"SELECT COUNT(*) FROM expressions_of_interest WHERE created_at >= {month}"),
            "byRole": grouped("SELECT role, COUNT(*) FROM expressions_of_interest GROUP BY role"),
            "byPathway": grouped("SELECT pathway, COUNT(*) FROM expressions_of_interest GROUP BY pathway"),
        },
        "quiz": {
            "completed": one("SELECT COUNT(*) FROM users WHERE quiz_completed_at IS NOT NULL"),
            "byPathway": grouped(
                "SELECT quiz_pathway, COUNT(*) FROM users WHERE quiz_pathway IS NOT NULL GROUP BY quiz_pathway"),
        },
        "coffeeChats": {
            "total": one("SELECT COUNT(*) FROM coffee_chat_requests"),
            "byStatus": grouped("SELECT status, COUNT(*) FROM coffee_chat_requests GROUP BY status"),
            "under18": one("SELECT COUNT(*) FROM coffee_chat_requests WHERE under_18 = 1"),
        },
        "practice": {
            "calls": one("SELECT COUNT(*) FROM interview_practice"),
            "people": one("SELECT COUNT(DISTINCT user_id) FROM interview_practice"),
            "averageScore": round(one("SELECT AVG(overall) FROM interview_practice") or 0),
            # How many calls scored under 40, 40 to 69, and 70 or more
            "bands": {"low": bands[0] or 0, "mid": bands[1] or 0, "high": bands[2] or 0},
        },
        "cvs": {
            "uploaded": one("SELECT COUNT(*) FROM user_cvs"),
            "averageScore": round(one("SELECT AVG(score) FROM user_cvs") or 0),
        },
        "saved": {
            "total": one("SELECT COUNT(*) FROM saved_opportunities"),
            "mostSaved": most_saved,
        },
        "feedback": {
            "total": feedback_total,
            "helpfulPercent": round(100 * feedback_yes / feedback_total) if feedback_total else None,
            "lowestPages": worst_pages,
        },
        "trend": {
            "days": days,
            "users": daily("users"),
            "interest": daily("expressions_of_interest"),
            "coffeeChats": daily("coffee_chat_requests"),
            "practice": daily("interview_practice"),
            "feedback": daily("page_feedback"),
        },
    })


# ---------- Opportunities ----------

def opportunity_to_dict(row, saved_ids):
    return {
        "id": row["id"],
        "title": row["title"],
        "employer": row["employer"],
        "location": row["location"],
        "pathway": row["pathway"],
        "type": row["type"],
        "closingDate": row["closing_date"],
        "applyUrl": row["apply_url"],
        "summary": row["summary"],
        "saved": row["id"] in saved_ids,
    }


def saved_ids_for(user):
    """Set of opportunity ids the given user has saved (empty if logged out)."""
    if user is None:
        return set()
    db = get_db()
    rows = db.execute(
        "SELECT opportunity_id FROM saved_opportunities WHERE user_id = ?",
        (user["id"],),
    ).fetchall()
    return {r["opportunity_id"] for r in rows}


@app.get("/api/opportunities")
def list_opportunities():
    """List all opportunities. If logged in, each carries a `saved` flag."""
    user = current_user()
    saved = saved_ids_for(user)
    db = get_db()
    rows = db.execute("SELECT * FROM opportunities ORDER BY closing_date").fetchall()
    items = [opportunity_to_dict(r, saved) for r in rows]
    return jsonify({"items": items, "count": len(items)})


@app.get("/api/saved-opportunities")
def list_saved_opportunities():
    """List the current user's saved opportunities."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    saved = saved_ids_for(user)
    db = get_db()
    rows = db.execute(
        """SELECT o.* FROM opportunities o
           JOIN saved_opportunities s ON s.opportunity_id = o.id
           WHERE s.user_id = ?
           ORDER BY s.created_at DESC""",
        (user["id"],),
    ).fetchall()
    items = [opportunity_to_dict(r, saved) for r in rows]
    return jsonify({"items": items, "count": len(items)})


@app.post("/api/opportunities/<int:opp_id>/save")
def save_opportunity(opp_id):
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in to save."}), 401
    db = get_db()
    exists = db.execute("SELECT id FROM opportunities WHERE id = ?", (opp_id,)).fetchone()
    if exists is None:
        return jsonify({"error": "That opportunity no longer exists."}), 404
    # INSERT OR IGNORE: saving something already saved is a no-op, not an error.
    db.execute(
        "INSERT OR IGNORE INTO saved_opportunities (user_id, opportunity_id) VALUES (?, ?)",
        (user["id"], opp_id),
    )
    db.commit()
    return jsonify({"ok": True, "saved": True})


@app.delete("/api/opportunities/<int:opp_id>/save")
def unsave_opportunity(opp_id):
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    db = get_db()
    db.execute(
        "DELETE FROM saved_opportunities WHERE user_id = ? AND opportunity_id = ?",
        (user["id"], opp_id),
    )
    db.commit()
    return jsonify({"ok": True, "saved": False})


@app.post("/api/opportunities")
def create_opportunity():
    """Admin only - add a new apprenticeship opportunity."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    if not user["is_admin"]:
        return jsonify({"error": "You do not have permission to do this."}), 403

    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    employer = (data.get("employer") or "").strip()
    location = (data.get("location") or "").strip()
    pathway = (data.get("pathway") or "").strip()
    opp_type = (data.get("type") or "Apprenticeship").strip()
    closing_date = (data.get("closingDate") or "").strip() or None
    apply_url = (data.get("applyUrl") or "").strip()
    summary = (data.get("summary") or "").strip()

    if not title or not employer or not location or not pathway or not apply_url:
        return jsonify({"error": "Title, employer, location, pathway and apply URL are required."}), 400
    if pathway not in PATHWAYS:
        return jsonify({"error": "Please choose a valid pathway."}), 400
    # Basic URL sanity check so the Apply button always points somewhere real.
    if not (apply_url.startswith("http://") or apply_url.startswith("https://")):
        return jsonify({"error": "Apply URL must start with http:// or https://"}), 400
    if closing_date:
        try:
            closing_date = datetime.strptime(closing_date, "%Y-%m-%d").strftime("%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Please enter the closing date as a date (YYYY-MM-DD)."}), 400

    db = get_db()
    cur = db.execute(
        """INSERT INTO opportunities
           (title, employer, location, pathway, type, closing_date, apply_url, summary)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (title, employer, location, pathway, opp_type, closing_date, apply_url, summary),
    )
    db.commit()
    row = db.execute("SELECT * FROM opportunities WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify({"opportunity": opportunity_to_dict(row, set())}), 201


@app.delete("/api/opportunities/<int:opp_id>")
def delete_opportunity(opp_id):
    """Admin only - remove an opportunity (and any saves of it)."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    if not user["is_admin"]:
        return jsonify({"error": "You do not have permission to do this."}), 403
    db = get_db()
    db.execute("DELETE FROM saved_opportunities WHERE opportunity_id = ?", (opp_id,))
    db.execute("DELETE FROM opportunities WHERE id = ?", (opp_id,))
    db.commit()
    return jsonify({"ok": True})


# ---------- Opportunity detail, resources, progress, files ----------

@app.get("/api/opportunities/<int:opp_id>")
def get_opportunity(opp_id):
    """Full detail for one opportunity, plus resources. If the user is
    logged in, also includes their saved flag, progress and uploaded files."""
    user = current_user()
    db = get_db()
    row = db.execute("SELECT * FROM opportunities WHERE id = ?", (opp_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Opportunity not found."}), 404

    saved = saved_ids_for(user)
    opp = opportunity_to_dict(row, saved)

    # Resources: those for this opportunity plus general ones (opportunity_id NULL).
    res_rows = db.execute(
        """SELECT * FROM resources
           WHERE opportunity_id = ? OR opportunity_id IS NULL
           ORDER BY opportunity_id IS NULL, id""",
        (opp_id,),
    ).fetchall()
    resources = [
        {
            "id": r["id"],
            "title": r["title"],
            "kind": r["kind"],
            "url": r["url"],
            "description": r["description"],
        }
        for r in res_rows
    ]

    progress = None
    files = []
    if user is not None:
        prow = db.execute(
            "SELECT * FROM application_progress WHERE user_id = ? AND opportunity_id = ?",
            (user["id"], opp_id),
        ).fetchone()
        if prow:
            progress = {"status": prow["status"], "notes": prow["notes"] or ""}
        frows = db.execute(
            """SELECT * FROM application_files
               WHERE user_id = ? AND opportunity_id = ?
               ORDER BY created_at DESC""",
            (user["id"], opp_id),
        ).fetchall()
        files = [
            {
                "id": f["id"],
                "name": f["original_name"],
                "size": f["size_bytes"],
                "createdAt": f["created_at"],
            }
            for f in frows
        ]

    return jsonify({
        "opportunity": opp,
        "resources": resources,
        "progress": progress,
        "files": files,
    })


APPLICATION_STATUSES = {
    "Not started", "Preparing", "Applied", "Interview", "Offer", "Unsuccessful",
}


@app.put("/api/opportunities/<int:opp_id>/progress")
def update_progress(opp_id):
    """Create or update the current user's progress (status + notes)."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401

    data = request.get_json(silent=True) or {}
    status = (data.get("status") or "Not started").strip()
    notes = (data.get("notes") or "").strip()
    if status not in APPLICATION_STATUSES:
        return jsonify({"error": "Invalid status."}), 400

    db = get_db()
    exists = db.execute("SELECT id FROM opportunities WHERE id = ?", (opp_id,)).fetchone()
    if exists is None:
        return jsonify({"error": "Opportunity not found."}), 404

    # UPSERT: one progress row per (user, opportunity).
    db.execute(
        """INSERT INTO application_progress (user_id, opportunity_id, status, notes, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_id, opportunity_id)
           DO UPDATE SET status = excluded.status,
                         notes = excluded.notes,
                         updated_at = datetime('now')""",
        (user["id"], opp_id, status, notes),
    )
    db.commit()
    return jsonify({"ok": True, "progress": {"status": status, "notes": notes}})


@app.post("/api/opportunities/<int:opp_id>/files")
def upload_file(opp_id):
    """Upload a file against the current user's application for this opportunity."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401

    db = get_db()
    exists = db.execute("SELECT id FROM opportunities WHERE id = ?", (opp_id,)).fetchone()
    if exists is None:
        return jsonify({"error": "Opportunity not found."}), 404

    if "file" not in request.files:
        return jsonify({"error": "No file was provided."}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "No file was selected."}), 400

    original = secure_filename(f.filename)
    ext = os.path.splitext(original)[1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        return jsonify({"error": "That file type is not allowed."}), 400

    # Store under a unique name so uploads never clash or overwrite.
    stored = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, stored)
    f.save(path)
    size = os.path.getsize(path)

    cur = db.execute(
        """INSERT INTO application_files
           (user_id, opportunity_id, original_name, stored_name, size_bytes)
           VALUES (?, ?, ?, ?, ?)""",
        (user["id"], opp_id, original, stored, size),
    )
    db.commit()
    return jsonify({
        "ok": True,
        "file": {"id": cur.lastrowid, "name": original, "size": size},
    }), 201


@app.get("/api/files/<int:file_id>")
def download_file(file_id):
    """Download one of the current user's uploaded files."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    db = get_db()
    row = db.execute("SELECT * FROM application_files WHERE id = ?", (file_id,)).fetchone()
    if row is None or row["user_id"] != user["id"]:
        # Never reveal another user's files.
        return jsonify({"error": "File not found."}), 404
    return send_from_directory(
        UPLOAD_DIR, row["stored_name"],
        as_attachment=True, download_name=row["original_name"],
    )


@app.delete("/api/files/<int:file_id>")
def delete_file(file_id):
    """Delete one of the current user's uploaded files."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    db = get_db()
    row = db.execute("SELECT * FROM application_files WHERE id = ?", (file_id,)).fetchone()
    if row is None or row["user_id"] != user["id"]:
        return jsonify({"error": "File not found."}), 404
    # Remove the file from disk, then the record.
    try:
        os.remove(os.path.join(UPLOAD_DIR, row["stored_name"]))
    except OSError:
        pass
    db.execute("DELETE FROM application_files WHERE id = ?", (file_id,))
    db.commit()
    return jsonify({"ok": True})


# ---------- AI pathway explainer (local, no external API) ----------
#
# This is a local, rule-based natural-language generator. It takes the
# quiz scores and composes a short, personalised explanation of why the
# top pathway fits. It is "AI" in the sense of an expert-system / template
# approach - no external LLM, no API key, works offline. For the Task 4
# write-up: this shows the idea of generated, personalised text while
# keeping data on-device (a privacy benefit) and being fully explainable
# (every sentence traces back to the student's own answers).

PATHWAY_PROFILES = {
    "Digital": {
        "strengths": "solving problems with technology, logical thinking and working with data",
        "roles": "software developer, data analyst or IT support technician",
        "study": "software development, data analysis and digital support",
    },
    "Business": {
        "strengths": "organising, planning and working with people",
        "roles": "operations assistant, project coordinator or business analyst",
        "study": "business operations, project management and marketing",
    },
    "Media": {
        "strengths": "creativity, communication and visual design",
        "roles": "content creator, junior designer or social media assistant",
        "study": "content creation, design and digital communication",
    },
    "Finance": {
        "strengths": "working with numbers, attention to detail and analysis",
        "roles": "finance assistant, accounts trainee or junior analyst",
        "study": "accounting, budgeting and financial analysis",
    },
    "Engineering": {
        "strengths": "hands-on building, technical design and understanding how things work",
        "roles": "engineering technician, design assistant or maintenance trainee",
        "study": "design and development, manufacturing and testing",
    },
}


@app.post("/api/pathway-explainer")
def pathway_explainer():
    """Generate a short, personalised explanation of why the top pathway
    fits, from the quiz scores. Local generation - no external API."""
    data = request.get_json(silent=True) or {}
    scores = data.get("scores") or {}
    if not isinstance(scores, dict) or not scores:
        return jsonify({"error": "No quiz scores were provided."}), 400

    # Keep only known pathways with numeric scores.
    clean = {}
    for p, v in scores.items():
        if p in PATHWAY_PROFILES:
            try:
                clean[p] = float(v)
            except (TypeError, ValueError):
                continue
    if not clean:
        return jsonify({"error": "No valid pathway scores were provided."}), 400

    ranked = sorted(clean.items(), key=lambda kv: kv[1], reverse=True)
    top, top_score = ranked[0]
    runner_up = ranked[1][0] if len(ranked) > 1 else None
    runner_score = ranked[1][1] if len(ranked) > 1 else 0
    profile = PATHWAY_PROFILES[top]

    # Confidence from the gap between first and second.
    gap = top_score - runner_score
    if gap >= 3:
        confidence = "a clear match"
    elif gap >= 1.5:
        confidence = "a strong match"
    else:
        confidence = "your closest match"

    # Compose the explanation from the student's own answer pattern.
    parts = []
    parts.append(
        f"Based on your answers, {top} looks like {confidence} for you."
    )
    parts.append(
        f"You leaned towards {profile['strengths']} - which is exactly what the "
        f"{top} pathway is built around."
    )
    parts.append(
        f"On a {top} T Level you would study {profile['study']}, and it can lead to "
        f"roles like a {profile['roles']}."
    )
    if runner_up and gap < 1.5:
        parts.append(
            f"You also showed interest in {runner_up}, so it is worth exploring both "
            f"before you decide - they are close for you."
        )
    else:
        parts.append(
            "Your answers pointed fairly consistently in one direction, so this is a "
            "good pathway to explore first."
        )

    explanation = " ".join(parts)
    return jsonify({
        "pathway": top,
        "confidence": confidence,
        "explanation": explanation,
    })


# ---------- Account settings and progress ----------

@app.put("/api/me")
def update_me():
    """Update the signed-in user's name, email, school and email preference."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    data = request.get_json(silent=True) or {}
    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    school = (data.get("school") or "").strip() or None
    email_updates = 1 if data.get("emailUpdates", True) else 0
    current_role = user["role"] if "role" in user.keys() else None
    role = data.get("role", current_role) or None
    if role is not None and role not in USER_ROLES:
        return jsonify({"error": ROLE_ERROR}), 400

    if not full_name or not email:
        return jsonify({"error": "Name and email are required."}), 400
    if not valid_email(email):
        return jsonify({"error": "Please enter a valid email address."}), 400

    db = get_db()
    taken = db.execute(
        "SELECT id FROM users WHERE email = ? AND id != ?", (email, user["id"])
    ).fetchone()
    if taken:
        return jsonify({"error": "That email is already used by another account."}), 409

    db.execute(
        "UPDATE users SET full_name = ?, email = ?, school = ?, email_updates = ?, role = ? WHERE id = ?",
        (full_name, email, school, email_updates, role, user["id"]),
    )
    db.commit()
    row = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    return jsonify({"user": user_to_dict(row)})


@app.put("/api/me/password")
def change_password():
    """Change password - requires the current password."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    data = request.get_json(silent=True) or {}
    current = data.get("currentPassword") or ""
    new = data.get("newPassword") or ""
    if not check_password_hash(user["password_hash"], current):
        return jsonify({"error": "Your current password is incorrect."}), 400
    if len(new) < 8:
        return jsonify({"error": "New password must be at least 8 characters."}), 400
    db = get_db()
    db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (generate_password_hash(new, method="pbkdf2:sha256"), user["id"]),
    )
    db.commit()
    return jsonify({"ok": True})


@app.delete("/api/me")
def delete_me():
    """Delete the signed-in user's account and their data (UK GDPR right to erasure)."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    db = get_db()
    files = db.execute(
        "SELECT stored_name FROM application_files WHERE user_id = ?", (user["id"],)
    ).fetchall()
    for f in files:
        try:
            os.remove(os.path.join(UPLOAD_DIR, f["stored_name"]))
        except OSError:
            pass
    cv = db.execute("SELECT stored_name FROM user_cvs WHERE user_id = ?", (user["id"],)).fetchone()
    if cv:
        try:
            os.remove(os.path.join(UPLOAD_DIR, cv["stored_name"]))
        except OSError:
            pass
    db.execute("DELETE FROM user_cvs WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM application_files WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM application_progress WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM saved_opportunities WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM coffee_chat_requests WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM interview_practice WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM password_resets WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM logbook_goals WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM logbook_entries WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM board_answers WHERE user_id = ? OR question_id IN "
               "(SELECT id FROM board_questions WHERE user_id = ?)", (user["id"], user["id"]))
    db.execute("DELETE FROM board_questions WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM board_reports WHERE user_id = ?", (user["id"],))
    db.execute("UPDATE expressions_of_interest SET user_id = NULL WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM users WHERE id = ?", (user["id"],))
    db.commit()
    session.clear()
    return jsonify({"ok": True})


@app.put("/api/me/role")
def set_my_role():
    """Set who the account is for. With keepExisting (used when someone signs in
    after picking a role on the homepage), an account's own role is never overwritten."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    data = request.get_json(silent=True) or {}
    role = data.get("role")
    if role not in USER_ROLES:
        return jsonify({"error": ROLE_ERROR}), 400
    current_role = user["role"] if "role" in user.keys() else None
    db = get_db()
    if not (data.get("keepExisting") and current_role):
        db.execute("UPDATE users SET role = ? WHERE id = ?", (role, user["id"]))
        db.commit()
    row = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    return jsonify({"user": user_to_dict(row)})


@app.get("/api/me/export")
def export_me():
    """Everything stored about the signed-in user, as JSON (UK GDPR right of access)."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    db = get_db()
    uid = user["id"]
    hidden = {"password_hash", "stored_name"}

    def rows(sql, args):
        out = []
        for r in db.execute(sql, args).fetchall():
            out.append({k: r[k] for k in r.keys() if k not in hidden})
        return out

    account = {k: user[k] for k in user.keys() if k not in hidden}
    return jsonify({
        "account": account,
        "savedOpportunities": rows(
            """SELECT o.id, o.title, o.employer, o.location, s.created_at AS saved_at
               FROM saved_opportunities s JOIN opportunities o ON o.id = s.opportunity_id
               WHERE s.user_id = ?""", (uid,)),
        "applicationProgress": rows("SELECT * FROM application_progress WHERE user_id = ?", (uid,)),
        "applicationFiles": rows("SELECT * FROM application_files WHERE user_id = ?", (uid,)),
        "cv": rows("SELECT * FROM user_cvs WHERE user_id = ?", (uid,)),
        "expressionsOfInterest": rows(
            "SELECT * FROM expressions_of_interest WHERE user_id = ? OR lower(email) = ?",
            (uid, (user["email"] or "").lower())),
        "coffeeChatRequests": rows("SELECT * FROM coffee_chat_requests WHERE user_id = ?", (uid,)),
        "interviewPractice": rows("SELECT * FROM interview_practice WHERE user_id = ?", (uid,)),
        "logbookGoals": rows("SELECT * FROM logbook_goals WHERE user_id = ?", (uid,)),
        "logbookEntries": rows("SELECT * FROM logbook_entries WHERE user_id = ?", (uid,)),
        "boardQuestions": rows("SELECT * FROM board_questions WHERE user_id = ?", (uid,)),
        "boardAnswers": rows("SELECT * FROM board_answers WHERE user_id = ?", (uid,)),
        "boardReports": rows("SELECT * FROM board_reports WHERE user_id = ?", (uid,)),
    })


@app.get("/api/me/progress")
def my_progress():
    """What the signed-in user has done, for the profile's next steps."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    db = get_db()
    row = db.execute(
        "SELECT COUNT(*) AS n FROM expressions_of_interest WHERE user_id = ? OR lower(email) = ?",
        (user["id"], (user["email"] or "").lower()),
    ).fetchone()
    return jsonify({
        "quizCompleted": bool(user["quiz_completed_at"]),
        "quizPathway": user["quiz_pathway"],
        "interestRegistered": row["n"] > 0,
    })


@app.post("/api/me/quiz-result")
def save_quiz_result():
    """Record the signed-in user's latest quiz result."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    data = request.get_json(silent=True) or {}
    pathway = (data.get("pathway") or "").strip()
    if pathway not in PATHWAYS:
        return jsonify({"error": "Please choose a valid pathway."}), 400
    db = get_db()
    db.execute(
        "UPDATE users SET quiz_pathway = ?, quiz_completed_at = datetime('now') WHERE id = ?",
        (pathway, user["id"]),
    )
    db.commit()
    return jsonify({"ok": True})


# ---------- CV upload and review ----------

CV_EXTENSIONS = {".pdf", ".docx", ".txt"}


def _cv_payload(row):
    return {
        "name": row["original_name"],
        "size": row["size_bytes"],
        "uploadedAt": row["uploaded_at"],
        "review": json.loads(row["review_json"]),
    }


@app.get("/api/me/cv")
def get_cv():
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    row = get_db().execute("SELECT * FROM user_cvs WHERE user_id = ?", (user["id"],)).fetchone()
    return jsonify({"cv": _cv_payload(row) if row else None})


@app.post("/api/me/cv")
def upload_cv():
    """Save the user's CV (replacing any old one) and review it."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    f = request.files.get("file")
    if f is None or not f.filename:
        return jsonify({"error": "Please choose a file."}), 400
    original = secure_filename(f.filename)
    ext = os.path.splitext(original)[1].lower()
    if ext not in CV_EXTENSIONS:
        return jsonify({"error": "Please upload your CV as a PDF, Word (.docx) or text file."}), 400

    stored = f"cv_{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, stored)
    f.save(path)
    try:
        text = extract_text(path, ext)
    except Exception:
        text = ""
    if len(text.split()) < 30:
        os.remove(path)
        return jsonify({"error": "We could not read the text in this file. If it is a scanned image, "
                                 "save your CV as a Word document or a text-based PDF and try again."}), 400

    review = review_cv(text)
    db = get_db()
    old = db.execute("SELECT stored_name FROM user_cvs WHERE user_id = ?", (user["id"],)).fetchone()
    if old:
        try:
            os.remove(os.path.join(UPLOAD_DIR, old["stored_name"]))
        except OSError:
            pass
    db.execute(
        """INSERT INTO user_cvs (user_id, original_name, stored_name, size_bytes, score, review_json, uploaded_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET original_name = excluded.original_name,
             stored_name = excluded.stored_name, size_bytes = excluded.size_bytes,
             score = excluded.score, review_json = excluded.review_json, uploaded_at = excluded.uploaded_at""",
        (user["id"], original, stored, os.path.getsize(path), review["score"], json.dumps(review)),
    )
    db.commit()
    row = db.execute("SELECT * FROM user_cvs WHERE user_id = ?", (user["id"],)).fetchone()
    return jsonify({"cv": _cv_payload(row)}), 201


@app.get("/api/me/cv/file")
def download_cv():
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    row = get_db().execute("SELECT * FROM user_cvs WHERE user_id = ?", (user["id"],)).fetchone()
    if row is None:
        return jsonify({"error": "No CV uploaded."}), 404
    return send_from_directory(UPLOAD_DIR, row["stored_name"], as_attachment=True,
                               download_name=row["original_name"])


@app.delete("/api/me/cv")
def delete_cv():
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    db = get_db()
    row = db.execute("SELECT stored_name FROM user_cvs WHERE user_id = ?", (user["id"],)).fetchone()
    if row:
        try:
            os.remove(os.path.join(UPLOAD_DIR, row["stored_name"]))
        except OSError:
            pass
        db.execute("DELETE FROM user_cvs WHERE user_id = ?", (user["id"],))
        db.commit()
    return jsonify({"ok": True})


# ---------- Application tracker (My profile > Applications) ----------

@app.get("/api/me/applications")
def my_applications():
    """Every opportunity the user has saved or set a stage for, with that stage."""
    user = current_user()
    if user is None:
        return jsonify({"error": "You must be signed in."}), 401
    rows = get_db().execute(
        """SELECT o.*, p.status AS progress_status, p.notes AS progress_notes,
                  p.updated_at AS progress_updated, s.opportunity_id AS saved_id
           FROM opportunities o
           LEFT JOIN application_progress p ON p.opportunity_id = o.id AND p.user_id = ?
           LEFT JOIN saved_opportunities s ON s.opportunity_id = o.id AND s.user_id = ?
           WHERE p.opportunity_id IS NOT NULL OR s.opportunity_id IS NOT NULL
           ORDER BY o.closing_date""",
        (user["id"], user["id"]),
    ).fetchall()
    items = []
    for r in rows:
        item = opportunity_to_dict(r, {r["id"]} if r["saved_id"] else set())
        item.update({"status": r["progress_status"] or "Not started", "notes": r["progress_notes"] or "",
                     "updatedAt": r["progress_updated"]})
        items.append(item)
    return jsonify({"items": items, "statuses": sorted(APPLICATION_STATUSES)})


# ---------- Placement logbook ----------
# T Level students keep a logbook and work towards technical and employability
# goals (see the Advice page). Students can print it or save it as a PDF.
LOGBOOK_KINDS = {"technical", "employability"}


def _logbook(db, uid):
    goals = [{"id": r["id"], "kind": r["kind"], "text": r["text"], "done": bool(r["done"])}
             for r in db.execute("SELECT * FROM logbook_goals WHERE user_id = ? ORDER BY id", (uid,))]
    entries = [{"id": r["id"], "weekOf": r["week_of"], "hours": r["hours"], "did": r["did"],
                "learned": r["learned"] or "", "feedback": r["feedback"] or "", "updatedAt": r["updated_at"]}
               for r in db.execute(
                   "SELECT * FROM logbook_entries WHERE user_id = ? ORDER BY week_of DESC, id DESC", (uid,))]
    total = round(sum(e["hours"] or 0 for e in entries), 1)
    return {"goals": goals, "entries": entries, "totalHours": total, "targetHours": 315}


def _logbook_user():
    user = current_user()
    if user is None:
        return None, (jsonify({"error": "You must be signed in."}), 401)
    return user, None


@app.get("/api/me/logbook")
def get_logbook():
    user, err = _logbook_user()
    if err:
        return err
    return jsonify(_logbook(get_db(), user["id"]))


@app.post("/api/me/logbook/goals")
def add_logbook_goal():
    user, err = _logbook_user()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    kind = (data.get("kind") or "").strip()
    text = " ".join(str(data.get("text") or "").split())
    if kind not in LOGBOOK_KINDS:
        return jsonify({"error": "Please choose technical or employability."}), 400
    if not 3 <= len(text) <= 200:
        return jsonify({"error": "Please write a goal of 3 to 200 characters."}), 400
    db = get_db()
    count = db.execute("SELECT COUNT(*) FROM logbook_goals WHERE user_id = ? AND kind = ?",
                       (user["id"], kind)).fetchone()[0]
    if count >= 10:
        return jsonify({"error": "You can have up to 10 goals of each kind."}), 400
    db.execute("INSERT INTO logbook_goals (user_id, kind, text) VALUES (?, ?, ?)", (user["id"], kind, text))
    db.commit()
    return jsonify(_logbook(db, user["id"])), 201


@app.put("/api/me/logbook/goals/<int:goal_id>")
def update_logbook_goal(goal_id):
    user, err = _logbook_user()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    db = get_db()
    row = db.execute("SELECT * FROM logbook_goals WHERE id = ? AND user_id = ?", (goal_id, user["id"])).fetchone()
    if row is None:
        return jsonify({"error": "Goal not found."}), 404
    text = " ".join(str(data.get("text", row["text"]) or "").split())
    if not 3 <= len(text) <= 200:
        return jsonify({"error": "Please write a goal of 3 to 200 characters."}), 400
    done = 1 if data.get("done", bool(row["done"])) else 0
    db.execute("UPDATE logbook_goals SET text = ?, done = ? WHERE id = ?", (text, done, goal_id))
    db.commit()
    return jsonify(_logbook(db, user["id"]))


@app.delete("/api/me/logbook/goals/<int:goal_id>")
def delete_logbook_goal(goal_id):
    user, err = _logbook_user()
    if err:
        return err
    db = get_db()
    db.execute("DELETE FROM logbook_goals WHERE id = ? AND user_id = ?", (goal_id, user["id"]))
    db.commit()
    return jsonify(_logbook(db, user["id"]))


def _entry_fields(data):
    """Check a logbook entry. Returns (values, error message)."""
    week_of = (data.get("weekOf") or "").strip()
    try:
        week_of = datetime.strptime(week_of, "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        return None, "Please choose the week this entry is for."
    try:
        hours = float(data.get("hours") or 0)
    except (TypeError, ValueError):
        return None, "Hours must be a number."
    if not 0 <= hours <= 60:
        return None, "Hours must be between 0 and 60 for one week."
    did = str(data.get("did") or "").strip()
    learned = str(data.get("learned") or "").strip()
    feedback = str(data.get("feedback") or "").strip()
    if not did:
        return None, "Please say what you did this week."
    if max(len(did), len(learned), len(feedback)) > 2000:
        return None, "Please keep each box under 2,000 characters."
    return (week_of, round(hours, 1), did, learned or None, feedback or None), None


@app.post("/api/me/logbook/entries")
def add_logbook_entry():
    user, err = _logbook_user()
    if err:
        return err
    values, msg = _entry_fields(request.get_json(silent=True) or {})
    if msg:
        return jsonify({"error": msg}), 400
    db = get_db()
    db.execute("INSERT INTO logbook_entries (user_id, week_of, hours, did, learned, feedback) "
               "VALUES (?, ?, ?, ?, ?, ?)", (user["id"], *values))
    db.commit()
    return jsonify(_logbook(db, user["id"])), 201


@app.put("/api/me/logbook/entries/<int:entry_id>")
def update_logbook_entry(entry_id):
    user, err = _logbook_user()
    if err:
        return err
    values, msg = _entry_fields(request.get_json(silent=True) or {})
    if msg:
        return jsonify({"error": msg}), 400
    db = get_db()
    cur = db.execute("UPDATE logbook_entries SET week_of = ?, hours = ?, did = ?, learned = ?, feedback = ?, "
                     "updated_at = datetime('now') WHERE id = ? AND user_id = ?", (*values, entry_id, user["id"]))
    if cur.rowcount == 0:
        return jsonify({"error": "Entry not found."}), 404
    db.commit()
    return jsonify(_logbook(db, user["id"]))


@app.delete("/api/me/logbook/entries/<int:entry_id>")
def delete_logbook_entry(entry_id):
    user, err = _logbook_user()
    if err:
        return err
    db = get_db()
    db.execute("DELETE FROM logbook_entries WHERE id = ? AND user_id = ?", (entry_id, user["id"]))
    db.commit()
    return jsonify(_logbook(db, user["id"]))


# ---------- Question board (moderated) ----------
# Most users are under 18, so: every post is checked by an admin before anyone
# else sees it, personal details are blocked, there are no private messages,
# names show as first name + initial, and reported posts are hidden until checked.
BOARD_TOPICS = ["Choosing a pathway", "Placements", "Applying and interviews", "Apprenticeships", "Something else"]
_PERSONAL = [
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "an email address"),
    (re.compile(r"(\+44\s?7\d{3}|\b07\d{3})\s?\d{3}\s?\d{3}\b|\b0\d{10}\b"), "a phone number"),
    (re.compile(r"https?://|www\.|\b[\w-]+\.(com|co\.uk|org|net|io|me|uk)\b", re.I), "a link"),
    (re.compile(r"(?<![\w.])@[A-Za-z0-9_]{3,}"), "a social media username"),
    (re.compile(r"\b(snapchat|snap me|insta|instagram|tiktok|whatsapp|discord|telegram|dm me|message me|"
                r"add me)\b", re.I), "a way to contact you privately"),
    (re.compile(r"\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b"), "a postcode"),
]


def personal_detail(text):
    """What kind of personal detail the text contains, or None."""
    for rx, label in _PERSONAL:
        if rx.search(text or ""):
            return label
    return None


def _public_name(full_name):
    parts = (full_name or "").split()
    if not parts:
        return "Launchpad user"
    return parts[0] + (f" {parts[-1][0].upper()}." if len(parts) > 1 else "")


def _board_item(r, me):
    return {
        "id": r["id"],
        "body": r["body"] or "",
        "author": "Launchpad team" if r["is_admin"] else _public_name(r["full_name"]),
        "team": bool(r["is_admin"]),
        "mine": me is not None and r["user_id"] == me["id"],
        "pending": r["status"] != "approved",
        "createdAt": r["created_at"],
    }


def _personal_message(text):
    found = personal_detail(text)
    if found:
        return (f"Please take out {found}. To keep everyone safe, never share personal or contact "
                "details on the board.")
    return None


@app.get("/api/board")
def list_board():
    """Approved questions and answers, plus the signed-in user's own posts waiting for approval."""
    me = current_user()
    uid = me["id"] if me else -1
    db = get_db()
    qs = db.execute(
        """SELECT q.*, u.full_name, u.is_admin FROM board_questions q JOIN users u ON u.id = q.user_id
           WHERE q.status = 'approved' OR (q.user_id = ? AND q.status = 'pending')
           ORDER BY q.created_at DESC, q.id DESC LIMIT 100""", (uid,)).fetchall()
    ans = db.execute(
        """SELECT a.*, u.full_name, u.is_admin FROM board_answers a JOIN users u ON u.id = a.user_id
           WHERE a.status = 'approved' OR (a.user_id = ? AND a.status = 'pending')
           ORDER BY a.created_at, a.id""", (uid,)).fetchall()
    by_q = {}
    for a in ans:
        by_q.setdefault(a["question_id"], []).append(_board_item(a, me))
    items = []
    for q in qs:
        item = _board_item(q, me)
        item.update({"title": q["title"], "topic": q["topic"], "answers": by_q.get(q["id"], [])})
        items.append(item)
    return jsonify({"items": items, "topics": BOARD_TOPICS})


@app.post("/api/board/questions")
def ask_board_question():
    me = current_user()
    if me is None:
        return jsonify({"error": "Please sign in to ask a question."}), 401
    if rate_limited("board:" + str(me["id"]), 10, 3600):
        return too_many()
    data = request.get_json(silent=True) or {}
    title = " ".join(str(data.get("title") or "").split())
    body = str(data.get("body") or "").strip()
    topic = (data.get("topic") or "").strip()
    if topic not in BOARD_TOPICS:
        return jsonify({"error": "Please choose a topic."}), 400
    if not 8 <= len(title) <= 140:
        return jsonify({"error": "Please write your question in 8 to 140 characters."}), 400
    if len(body) > 1500:
        return jsonify({"error": "Please keep the extra detail under 1,500 characters."}), 400
    msg = _personal_message(f"{title} {body}")
    if msg:
        return jsonify({"error": msg}), 400
    status = "approved" if me["is_admin"] else "pending"
    db = get_db()
    db.execute("INSERT INTO board_questions (user_id, title, body, topic, status) VALUES (?, ?, ?, ?, ?)",
               (me["id"], title, body or None, topic, status))
    db.commit()
    return jsonify({"ok": True, "pending": status == "pending",
                    "safety": safety_concern(f"{title} {body}")}), 201


@app.post("/api/board/questions/<int:question_id>/answers")
def answer_board_question(question_id):
    me = current_user()
    if me is None:
        return jsonify({"error": "Please sign in to answer."}), 401
    if rate_limited("board:" + str(me["id"]), 10, 3600):
        return too_many()
    db = get_db()
    q = db.execute("SELECT id FROM board_questions WHERE id = ? AND status = 'approved'", (question_id,)).fetchone()
    if q is None:
        return jsonify({"error": "Question not found."}), 404
    body = str((request.get_json(silent=True) or {}).get("body") or "").strip()
    if not 2 <= len(body) <= 1500:
        return jsonify({"error": "Please write an answer of up to 1,500 characters."}), 400
    msg = _personal_message(body)
    if msg:
        return jsonify({"error": msg}), 400
    status = "approved" if me["is_admin"] else "pending"
    db.execute("INSERT INTO board_answers (question_id, user_id, body, status) VALUES (?, ?, ?, ?)",
               (question_id, me["id"], body, status))
    db.commit()
    return jsonify({"ok": True, "pending": status == "pending", "safety": safety_concern(body)}), 201


@app.post("/api/board/report")
def report_board_post():
    """Report a post. It's hidden straight away until an admin checks it."""
    me = current_user()
    if me is None:
        return jsonify({"error": "Please sign in to report a post."}), 401
    data = request.get_json(silent=True) or {}
    kind = data.get("kind")
    table = {"question": "board_questions", "answer": "board_answers"}.get(kind)
    try:
        item_id = int(data.get("id"))
    except (TypeError, ValueError):
        item_id = None
    if table is None or item_id is None:
        return jsonify({"error": "That post wasn't found."}), 400
    reason = " ".join(str(data.get("reason") or "").split())[:300]
    db = get_db()
    row = db.execute(f"SELECT id FROM {table} WHERE id = ? AND status = 'approved'", (item_id,)).fetchone()
    if row is None:
        return jsonify({"error": "That post wasn't found."}), 404
    db.execute("INSERT OR IGNORE INTO board_reports (kind, item_id, user_id, reason) VALUES (?, ?, ?, ?)",
               (kind, item_id, me["id"], reason or None))
    db.execute(f"UPDATE {table} SET status = 'pending', reported = reported + 1 WHERE id = ?", (item_id,))
    db.commit()
    return jsonify({"ok": True})


@app.get("/api/admin/board")
def admin_board():
    """Posts waiting for a check: new ones, and reported ones (with the reasons)."""
    _, err = require_admin()
    if err:
        return err
    db = get_db()

    def reasons(kind, item_id):
        return [r["reason"] for r in db.execute(
            "SELECT reason FROM board_reports WHERE kind = ? AND item_id = ? AND reason IS NOT NULL",
            (kind, item_id))]

    out = []
    for r in db.execute("""SELECT q.*, u.full_name, u.email FROM board_questions q JOIN users u ON u.id = q.user_id
                           WHERE q.status = 'pending' ORDER BY q.created_at""").fetchall():
        out.append({"kind": "question", "id": r["id"], "title": r["title"], "body": r["body"] or "",
                    "topic": r["topic"], "author": r["full_name"], "email": r["email"],
                    "reported": r["reported"], "reasons": reasons("question", r["id"]),
                    "safety": safety_concern(f"{r['title']} {r['body'] or ''}"), "createdAt": r["created_at"]})
    for r in db.execute("""SELECT a.*, u.full_name, u.email, q.title AS q_title FROM board_answers a
                           JOIN users u ON u.id = a.user_id JOIN board_questions q ON q.id = a.question_id
                           WHERE a.status = 'pending' ORDER BY a.created_at""").fetchall():
        out.append({"kind": "answer", "id": r["id"], "title": r["q_title"], "body": r["body"],
                    "author": r["full_name"], "email": r["email"], "reported": r["reported"],
                    "reasons": reasons("answer", r["id"]), "safety": safety_concern(r["body"]),
                    "createdAt": r["created_at"]})
    return jsonify({"items": out, "count": len(out)})


@app.put("/api/admin/board/<kind>/<int:item_id>")
def moderate_board_post(kind, item_id):
    _, err = require_admin()
    if err:
        return err
    table = {"question": "board_questions", "answer": "board_answers"}.get(kind)
    action = (request.get_json(silent=True) or {}).get("action")
    if table is None or action not in ("approve", "reject"):
        return jsonify({"error": "Choose approve or reject."}), 400
    db = get_db()
    cur = db.execute(f"UPDATE {table} SET status = ?, reviewed_at = datetime('now') WHERE id = ?",
                     ("approved" if action == "approve" else "rejected", item_id))
    if cur.rowcount == 0:
        return jsonify({"error": "Post not found."}), 404
    db.commit()
    return jsonify({"ok": True})


# ---------- Ask Launchpad (help assistant) ----------
# Answers questions about the site and T Levels, using only facts from the site.
# Uses the local AI if it's running, otherwise fixed answers. Nothing is saved.
ASSISTANT_LINKS = [
    (r"\bquiz\b|which pathway|what pathway|suits? me", "/quiz", "Career quiz"),
    (r"interview|practi[cs]e", "/interview", "Interview practice"),
    (r"coffee|chat with|talk to|mentor|buddy|alum", "/alumni/coffee-chats", "Coffee chats"),
    (r"opportunit|apprentice|vacanc|\bjobs?\b|apply|application", "/opportunities", "Opportunities"),
    (r"track|my applications", "/profile#applications", "My applications"),
    (r"t ?levels?|placement|hours|how long", "/tlevel", "T Levels"),
    (r"parent|carer|my child|my son|my daughter", "/parents", "Parents and carers"),
    (r"\bsafe|safety|safeguard|worried|hurt|bull", "/safeguarding", "Staying safe"),
    (r"\bcv\b|resume", "/profile#cv", "Your CV"),
    (r"logbook|log book|goals", "/logbook", "My logbook"),
    (r"question board|community|other students", "/community", "Question board"),
    (r"school|college|teacher", "/register-interest?role=school", "Register interest (schools)"),
    (r"register|interest", "/register-interest", "Register interest"),
    (r"pathway|digital|business|media|finance|engineering", "/information", "Pathways"),
    (r"accessib|text size|bigger text|aloud|contrast|dark mode|colour.?blind", "/accessibility", "Accessibility"),
    (r"privacy|my data|delete", "/privacy", "Privacy"),
    (r"advice|tips", "/t-level/advice", "Advice"),
]
_ASSISTANT_LINKS = [(re.compile(p, re.I), to, label) for p, to, label in ASSISTANT_LINKS]


def assistant_links(text, limit=3):
    out = []
    for rx, to, label in _ASSISTANT_LINKS:
        if rx.search(text or "") and all(o["to"] != to for o in out):
            out.append({"to": to, "label": label})
        if len(out) >= limit:
            break
    return out


@app.post("/api/assistant")
def ask_assistant():
    if rate_limited("assistant", 60, 3600):
        return too_many()
    data = request.get_json(silent=True) or {}
    question = " ".join(str(data.get("message") or "").split())
    if not question:
        return jsonify({"error": "Please type a question."}), 400
    if len(question) > 500:
        return jsonify({"error": "Please keep your question under 500 characters."}), 400
    history = []
    raw = data.get("history")
    if isinstance(raw, list):
        for h in raw[-6:]:
            if isinstance(h, dict) and h.get("role") in ("user", "assistant"):
                history.append({"role": h["role"], "text": " ".join(str(h.get("text") or "").split())[:500]})

    if safety_concern(question):
        return jsonify({"answer": SAFEGUARD_REPLY, "links": [{"to": "/safeguarding", "label": "Staying safe"}],
                        "source": "rules", "safety": True})
    # "Thanks", "hi", "ok": a friendly fixed reply, no facts and no links.
    small = small_talk_reply(question)
    if small:
        return jsonify({"answer": small, "links": [], "source": "rules", "safety": False})

    # Only the facts that match the question (and the one before it, for "how long is that?").
    last_user = next((h["text"] for h in reversed(history) if h["role"] == "user"), "")
    facts = pick_facts(question, site_facts()) or pick_facts(f"{last_user} {question}", site_facts())
    answer = ai_assistant(question, history, facts) if facts else None
    source = "ai" if answer else "rules"
    if not answer:
        answer = assistant_reply(question)
    links = assistant_links(question)
    if not answer:
        answer = ("I'm not sure about that one. Try the Help page, or ask on the question board and the "
                  "Launchpad team will answer.")
        links = links or [{"to": "/help", "label": "Help"}, {"to": "/community", "label": "Question board"}]
    return jsonify({"answer": answer, "links": links, "source": source, "safety": False})


if __name__ == "__main__":
    init_db()
    app.run(port=5000, debug=True)
