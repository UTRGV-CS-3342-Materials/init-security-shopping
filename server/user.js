// The User model: everything about users (rules, hashing, queries) in one place.
// Routes ask it questions ("who is this?", "can they log in?") and never touch password_hash themselves.

import argon2 from 'argon2';
import { db } from './db.js';

// slow on purpose, with a random salt per user: the same password never hashes the same way twice,
// so a stolen database can't be matched against a precomputed table.
// The string it returns holds everything needed to check a guess later: the settings, the salt, and the hash.
function hashPassword(password) {
	return argon2.hash(password);
}

// compares every byte no matter what, so response time doesn't hint at how close a guess was
function verifyPassword(password, stored) {
	return argon2.verify(stored, password);
}

export class User {
	// takes a database row, so a query result can become a User directly
	constructor(row) {
		this.id = row.id;
		this.username = row.username;
		this.admin = Boolean(row.admin);
		this.password_hash = row.password_hash;
	}

	// res.json() calls this: the hash never leaves the server, even by accident
	toJSON() {
		return { id: this.id, username: this.username, admin: this.admin };
	}

	static findById(id) {
		const row = db.prepare('SELECT * FROM user WHERE id = ?').get(id);
		return row ? new User(row) : null;
	}

	static findByUsername(username) {
		const row = db.prepare('SELECT * FROM user WHERE username = ?').get(username);
		return row ? new User(row) : null;
	}

	// returns { user, errors }: a new User if the data was good, otherwise every problem at once
	static async signup(username, password) {
		username = username?.trim() ?? '';
		password = password ?? '';

		const errors = [];
		if (!username) errors.push('Username is required.');
		else if (User.findByUsername(username)) errors.push('That username is taken.');
		if (password.length < 8) errors.push('Password must be at least 8 characters.');

		if (errors.length > 0) return { user: null, errors };

		const passwordHash = await hashPassword(password);
		const { lastInsertRowid } = db
			.prepare('INSERT INTO user (username, password_hash) VALUES (?, ?)')
			.run(username, passwordHash);
		return { user: User.findById(lastInsertRowid), errors };
	}

	// the User if the username/password match, otherwise null
	// (one answer for both "no such user" and "wrong password", so a guesser can't tell which)
	static async login(username, password) {
		if (!username || !password) return null;

		const user = User.findByUsername(username.trim());
		if (!user) return null;

		return (await verifyPassword(password, user.password_hash)) ? user : null;
	}
}
