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
    SELECT 'Software Development Engineer Apprentice', 'Amazon', 'London', 'Digital', 'Apprenticeship', '2027-01-31', 'https://amazonapprenticeships.co.uk/our-programmes/software-development-engineer-apprentice', 'Build real software alongside Amazon engineers while you train.'
    UNION ALL SELECT 'DevOps Engineer Apprentice', 'Amazon', 'Manchester', 'Digital', 'Apprenticeship', '2027-02-15', 'https://amazonapprenticeships.co.uk/our-programmes/devops-engineer-apprentice', 'Connect software and operations, automating how Amazon teams deliver.'
    UNION ALL SELECT 'Digital Product Manager Apprentice', 'Amazon', 'Leeds', 'Business', 'Apprenticeship', '2027-02-28', 'https://amazonapprenticeships.co.uk/our-programmes/digital-product-manager', 'Shape digital products from idea to launch across Amazon.'
    UNION ALL SELECT 'Digital Product Manager Apprentice', 'Amazon', 'London', 'Media', 'Apprenticeship', '2027-03-10', 'https://amazonapprenticeships.co.uk/our-programmes/digital-product-manager', 'Work on product, content and user experience across digital channels.'
    UNION ALL SELECT 'Finance Apprentice', 'Amazon', 'Edinburgh', 'Finance', 'Apprenticeship', '2027-03-20', 'https://amazonapprenticeships.co.uk/our-programmes/finance-apprentice', 'Rotate through accounting, finance and tax in a global business.'
    UNION ALL SELECT 'OEM Engineering Apprentice', 'Amazon', 'Birmingham', 'Engineering', 'Apprenticeship', '2027-03-31', 'https://amazonapprenticeships.co.uk/oem-apprentice', 'Train as a multi-skilled electrical and mechanical technician.'
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
    SELECT NULL, 'How to pass an assessment centre', 'Guide', '/guides/assessment-centre', 'What to expect and how to prepare for assessment-centre days.'
    UNION ALL SELECT NULL, 'Interview preparation tips', 'Guide', '/guides/interview-prep', 'Common questions and how to structure strong answers.'
    UNION ALL SELECT NULL, 'Writing a great application', 'Guide', '/guides/great-application', 'How to present your skills and experience clearly.'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM resources);
