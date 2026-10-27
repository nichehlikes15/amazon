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

CREATE TABLE IF NOT EXISTS opportunities (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    employer     TEXT    NOT NULL,
    location     TEXT    NOT NULL,
    pathway      TEXT    NOT NULL,            -- Digital / Business / Media / Finance / Engineering
    type         TEXT    NOT NULL DEFAULT 'Apprenticeship',
    closing_date TEXT,                        -- ISO date, optional
    apply_url    TEXT    NOT NULL,
    summary      TEXT
);

CREATE TABLE IF NOT EXISTS saved_opportunities (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL,
    opportunity_id INTEGER NOT NULL,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, opportunity_id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id)
);

-- Seed a few sample apprenticeships the first time the table is empty.
INSERT INTO opportunities (title, employer, location, pathway, type, closing_date, apply_url, summary)
SELECT * FROM (
    SELECT 'Software Development Engineer Apprentice', 'Amazon', 'Cupertino, USA', 'Digital', 'Apprenticeship', '2027-03-31', 'https://www.amazon.jobs/en/jobs/3188438/software-development-engineer-apprentice-military-veterans', 'Learn to build software with Amazon engineers. This role is for military veterans.'
    UNION ALL SELECT 'Automation Engineer Apprentice', 'Amazon', 'Daytona Beach, USA', 'Engineering', 'Apprenticeship', '2027-03-31', 'https://www.amazon.jobs/en/jobs/10553762/automation-engineer-apprentice', 'Learn to look after and improve the automated systems in an Amazon site.'
    UNION ALL SELECT 'Amazon Youth Apprenticeship Program', 'Amazon', 'Cupertino, USA', 'Business', 'Apprenticeship', '2027-03-31', 'https://www.amazon.jobs/en/jobs/10529804/amazon-youth-apprenticeship-program', 'A paid apprenticeship for young people to learn how a business works.'
    UNION ALL SELECT 'Graduate Automation Engineer Apprenticeship Program', 'Amazon', 'Kojetin, Czech Republic', 'Engineering', 'Apprenticeship', '2027-03-31', 'https://www.amazon.jobs/en/jobs/10578695/graduate-automation-engineer-apprenticeship-program', 'Train as an automation engineer working with robotics and machines.'
    UNION ALL SELECT 'Automation Engineer (work and study)', 'Amazon', 'Kaiserslautern, Germany', 'Engineering', 'Apprenticeship', '2027-03-31', 'https://www.amazon.jobs/en/jobs/10586445/duales-studium-automation-engineer', 'Study for a degree while training as an automation engineer.'
    UNION ALL SELECT 'Mechatronic Apprentice I', 'Amazon', 'San Antonio, USA', 'Engineering', 'Apprenticeship', '2027-03-31', 'https://www.amazon.jobs/en/jobs/10579284/mechatronic-apprentice-i', 'Train to maintain and repair the robotics and machines in Amazon sites.'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM opportunities);

CREATE TABLE IF NOT EXISTS resources (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER,                   -- NULL means it applies to all opportunities
    title          TEXT    NOT NULL,
    kind           TEXT    NOT NULL DEFAULT 'Guide',  -- Guide / Video / PDF / Link
    url            TEXT    NOT NULL,
    description    TEXT,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id)
);

CREATE TABLE IF NOT EXISTS application_progress (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL,
    opportunity_id INTEGER NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'Not started',
    notes          TEXT,
    updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, opportunity_id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id)
);

CREATE TABLE IF NOT EXISTS application_files (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL,
    opportunity_id INTEGER NOT NULL,
    original_name  TEXT    NOT NULL,
    stored_name    TEXT    NOT NULL,          -- unique name on disk
    size_bytes     INTEGER NOT NULL,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id)
);

-- Seed a couple of general prep resources the first time the table is empty.
INSERT INTO resources (opportunity_id, title, kind, url, description)
SELECT * FROM (
    SELECT NULL, 'How to pass an assessment centre', 'PDF guide', '/guides/how-to-pass-an-assessment-centre.pdf', 'What to expect and how to prepare for assessment-centre days.'
    UNION ALL SELECT NULL, 'Interview preparation tips', 'PDF guide', '/guides/interview-preparation-tips.pdf', 'Common questions and how to structure strong answers.'
    UNION ALL SELECT NULL, 'Writing a great application', 'PDF guide', '/guides/writing-a-great-application.pdf', 'How to present your skills and experience clearly.'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM resources);

CREATE TABLE IF NOT EXISTS user_cvs (
    user_id        INTEGER PRIMARY KEY,      -- one CV per user
    original_name  TEXT    NOT NULL,
    stored_name    TEXT    NOT NULL,
    size_bytes     INTEGER NOT NULL,
    score          INTEGER NOT NULL,
    review_json    TEXT    NOT NULL,
    uploaded_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Coffee chat requests from the Coffee chats page.
CREATE TABLE IF NOT EXISTS coffee_chat_requests (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER,                   -- NULL if sent while signed out
    mentor         TEXT    NOT NULL,          -- who they want to chat with
    full_name      TEXT    NOT NULL,
    email          TEXT    NOT NULL,
    preferred_time TEXT    NOT NULL,
    topic          TEXT,
    message        TEXT,
    status         TEXT    NOT NULL DEFAULT 'Requested',
    confirmed_time TEXT,                      -- set by an admin, e.g. 2026-11-03T15:30
    meeting_link   TEXT,                      -- https:// link set by an admin
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (id)
);
