// The database lives with the API server now: the browser app never touches it.

import Database from 'better-sqlite3';

const db = new Database(process.env.DB_FILE ?? 'shopping.sqlite');

export function getItems() {
	return db.prepare('SELECT * FROM item').all();
}

export function getItem(itemId) {
	return db.prepare('SELECT * FROM item WHERE id = ?').get(itemId);
}

export function getReviews(itemId) {
	return db.prepare('SELECT * FROM review WHERE item_id = ?').all(itemId);
}

// returns the saved row so the API can hand the real id back to the client
export function addReview(itemId, author, content) {
	const { lastInsertRowid } = db
		.prepare('INSERT INTO review (item_id, author, content) VALUES (?, ?, ?)')
		.run(itemId, author, content);
	return { id: lastInsertRowid, item_id: itemId, author, content };
}
