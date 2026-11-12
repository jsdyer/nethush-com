CREATE TABLE site_settings (id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE daily_counts (day TEXT NOT NULL, metric TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0), PRIMARY KEY (day, metric));
--> statement-breakpoint
CREATE TABLE source_health (source TEXT PRIMARY KEY, checked_at TEXT NOT NULL, fetched_at TEXT, state TEXT NOT NULL, duration_ms INTEGER NOT NULL, bytes INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE admin_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, happened_at TEXT NOT NULL, action TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE admin_credentials (id INTEGER PRIMARY KEY CHECK (id = 1), salt TEXT NOT NULL, password_hash TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE admin_sessions (token_hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE action_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);
