// Adds who wrote each review. Run once: node migrate-review.js
import { db } from './db.js';

db.exec('ALTER TABLE review ADD COLUMN user_id INTEGER REFERENCES user(id)');
