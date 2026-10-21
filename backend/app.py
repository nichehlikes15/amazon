"""
Security notes (prototype level):
  - Passwords are hashed with werkzeug (PBKDF2); plain text is never stored.
  - All SQL uses parameterised queries, so there is no SQL injection risk.
  - Sessions use a signed cookie; CORS is limited to the dev frontend.
  - For production you would add: HTTPS, CSRF tokens, rate limiting,
    stronger session storage, and email verification.
"""

import os
import sqlite3

from flask import Flask, g, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "launchpad.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")

# Allowed pathways - kept in one place so validation is consistent.
PATHWAYS = {"Digital", "Business", "Media", "Finance", "Engineering"}

app = Flask(__name__)
# In production, load this from an environment variable, never hard-code it.
app.secret_key = os.environ.get("LAUNCHPAD_SECRET", "dev-secret-change-me")

# Allow the Vite dev server to call the API and send session cookies.
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])


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
    db.close()


def user_to_dict(row):
    return {
        "id": row["id"],
        "fullName": row["full_name"],
        "email": row["email"],
        "isAdmin": bool(row["is_admin"]),
    }


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
    data = request.get_json(silent=True) or {}
    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not full_name or not email or not password:
        return jsonify({"error": "All fields are required."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400

    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        return jsonify({"error": "An account with that email already exists."}), 409

    # Use PBKDF2 explicitly: werkzeug's newer default (scrypt) needs a Python
    # built with scrypt support in hashlib, which is not always available.
    # PBKDF2 is always available and is a solid choice for a prototype.
    password_hash = generate_password_hash(password, method="pbkdf2:sha256")
    cur = db.execute(
        "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
        (full_name, email, password_hash),
    )
    db.commit()

    session["user_id"] = cur.lastrowid
    return jsonify({"user": {"id": cur.lastrowid, "fullName": full_name, "email": email, "isAdmin": False}}), 201


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

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
    data = request.get_json(silent=True) or {}
    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    school = (data.get("school") or "").strip()
    pathway = (data.get("pathway") or "").strip()
    message = (data.get("message") or "").strip()

    if not full_name or not email or not pathway:
        return jsonify({"error": "Name, email and pathway are required."}), 400
    if pathway not in PATHWAYS:
        return jsonify({"error": "Please choose a valid pathway."}), 400

    db = get_db()
    db.execute(
        """INSERT INTO expressions_of_interest
           (user_id, full_name, email, school, pathway, message)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (session.get("user_id"), full_name, email, school, pathway, message),
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
            "message": r["message"],
            "createdAt": r["created_at"],
        }
        for r in rows
    ]
    return jsonify({"items": items, "count": len(items)})


if __name__ == "__main__":
    init_db()
    app.run(port=5000, debug=True)
