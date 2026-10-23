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
import uuid

from flask import Flask, g, jsonify, request, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "launchpad.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Upload limits for the prototype.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB per file
ALLOWED_UPLOAD_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt",
    ".png", ".jpg", ".jpeg",
}

# Allowed pathways - kept in one place so validation is consistent.
PATHWAYS = {"Digital", "Business", "Media", "Finance", "Engineering"}

app = Flask(__name__)
# In production, load this from an environment variable, never hard-code it.
app.secret_key = os.environ.get("LAUNCHPAD_SECRET", "dev-secret-change-me")
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES

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


if __name__ == "__main__":
    init_db()
    app.run(port=5000, debug=True)
