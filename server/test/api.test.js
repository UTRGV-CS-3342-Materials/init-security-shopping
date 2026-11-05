import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { newClient, queryDb, startServer } from '../test-helpers.js';

let stopServer;
before(async () => {
	stopServer = await startServer();
});
after(() => stopServer());

test('lists the items', async () => {
	const response = await newClient().get('/api/items');

	assert.equal(response.status, 200);
	assert.equal(response.json.items.length, 3);
});

test('an item that does not exist is a 404', async () => {
	const response = await newClient().get('/api/item_view/9999');

	assert.equal(response.status, 404);
});

test('saves a review', async () => {
	const response = await newClient().post('/api/item_view/6/reviews', { author: 'Sam', content: 'Nice.' });

	assert.equal(response.status, 201);
	const [row] = queryDb('SELECT * FROM review WHERE id = ?', response.json.review.id);
	assert.equal(row.content, 'Nice.');
});

test('rejects a blank review, and saves nothing', async () => {
	const [before] = queryDb('SELECT count(*) AS count FROM review');

	const response = await newClient().post('/api/item_view/6/reviews', { author: 'Sam', content: '   ' });

	assert.equal(response.status, 422);
	const [after] = queryDb('SELECT count(*) AS count FROM review');
	assert.equal(after.count, before.count);
});

test('rejects a review with no author', async () => {
	const response = await newClient().post('/api/item_view/6/reviews', { content: 'Nice.' });

	assert.equal(response.status, 422);
});
