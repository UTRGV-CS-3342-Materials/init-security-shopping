import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { newClient, startServer } from '../test-helpers.js';

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
