-- Launchpad database schema (SQLite)
-- Run automatically by app.py on first start.

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    is_admin      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expressions_of_interest (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,                      -- optional link to a logged-in user
    full_name   TEXT    NOT NULL,
    email       TEXT    NOT NULL,
    school      TEXT,
    pathway     TEXT    NOT NULL,             -- Digital / Business / Media / Finance / Engineering
    message     TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (id)
);
