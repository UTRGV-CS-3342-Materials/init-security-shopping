// Adds the user table. Run once: node migrate-user.js
import { db } from './db.js';

db.exec(`
	CREATE TABLE user (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		admin INTEGER NOT NULL DEFAULT 0
	)
`);
