// The database lives with the API server now: the browser app never touches it.

import Database from 'better-sqlite3';

// exported so the User model and sessions can run their own queries
export const db = new Database(process.env.DB_FILE ?? 'shopping.sqlite');

export function getItems() {
	return db.prepare('SELECT * FROM item').all();
}

export function getItem(itemId) {
	return db.prepare('SELECT * FROM item WHERE id = ?').get(itemId);
}

export function getReviews(itemId) {
	return db.prepare('SELECT * FROM review WHERE item_id = ?').all(itemId);
}

// author is a copy of the username, so older reviews (written before there were accounts) still show a name
// returns the saved row so the API can hand the real id back to the client
export function addReview(itemId, userId, author, content) {
	const { lastInsertRowid } = db
		.prepare('INSERT INTO review (item_id, user_id, author, content) VALUES (?, ?, ?, ?)')
		.run(itemId, userId, author, content);
	return { id: lastInsertRowid, item_id: itemId, user_id: userId, author, content };
}

// true if there was a review to delete
export function deleteReview(reviewId) {
	return db.prepare('DELETE FROM review WHERE id = ?').run(reviewId).changes > 0;
}
