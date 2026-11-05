import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { newClient, queryDb, startServer } from '../test-helpers.js';

let stopServer;
before(async () => {
	stopServer = await startServer();
});
after(() => stopServer());

// a new person, already logged in
async function register(username) {
	const client = newClient();
	const response = await client.post('/api/register', { username, password: 'correct-horse' });
	assert.equal(response.status, 201);
	return client;
}

async function logInAsAdmin() {
	const client = newClient();
	const response = await client.post('/api/login', { username: 'admin', password: 'admin-password' });
	assert.equal(response.status, 200);
	return client;
}

test('nobody is logged in to start with', async () => {
	const response = await newClient().get('/api/me');

	assert.equal(response.status, 200);
	assert.equal(response.json.user, null);
});

test('logging in sets an HttpOnly cookie, and the server then knows who you are', async () => {
	const client = await register('login-test');
	await client.post('/api/logout');

	const response = await client.post('/api/login', { username: 'login-test', password: 'correct-horse' });

	assert.equal(response.status, 200);
	assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
	assert.equal((await client.get('/api/me')).json.user.username, 'login-test');
});

test('a wrong password and an unknown user get the same answer', async () => {
	await register('wrong-password-test');

	const wrongPassword = await newClient().post('/api/login', { username: 'wrong-password-test', password: 'nope-nope-nope' });
	const unknownUser = await newClient().post('/api/login', { username: 'no-such-user', password: 'nope-nope-nope' });

	assert.equal(wrongPassword.status, 401);
	assert.equal(unknownUser.status, 401);
	assert.deepEqual(wrongPassword.json, unknownUser.json);
});

test('a login request with no body is rejected, not a crash', async () => {
	const response = await newClient().post('/api/login');

	assert.equal(response.status, 401);
});

test('the password hash never comes back', async () => {
	const client = newClient();
	const registered = await client.post('/api/register', { username: 'hash-test', password: 'correct-horse' });
	const me = await client.get('/api/me');

	const [{ password_hash }] = queryDb('SELECT password_hash FROM user WHERE username = ?', 'hash-test');
	assert.ok(!registered.text.includes(password_hash));
	assert.ok(!me.text.includes(password_hash));
});

test('a made-up cookie is nobody', async () => {
	const client = newClient();
	client.setCookie('session=made-up');

	assert.equal((await client.get('/api/me')).json.user, null);
});

test('logging out ends the session on the server, not just in the browser', async () => {
	const client = await register('logout-test');
	const cookie = client.getCookie();

	await client.post('/api/logout');

	// put the old cookie back, like someone who saved a copy of it
	client.setCookie(cookie);
	assert.equal((await client.get('/api/me')).json.user, null);
});

test('a cookie with a changed id is nobody', async () => {
	const client = await register('tamper-test');
	const cookie = client.getCookie();

	// the id is before the dot, the signature is after it. Change the last character of the id.
	const dot = cookie.indexOf('.');
	const last = cookie[dot - 1];
	client.setCookie(cookie.slice(0, dot - 1) + (last === 'a' ? 'b' : 'a') + cookie.slice(dot));

	assert.equal((await client.get('/api/me')).json.user, null);
});

test('posting a review takes a login', async () => {
	const response = await newClient().post('/api/item_view/6/reviews', { content: 'Hello.' });

	assert.equal(response.status, 401);
});

test('the author comes from the session, whatever the body says', async () => {
	const client = await register('real-author');

	const response = await client.post('/api/item_view/6/reviews', { content: 'Hello.', author: 'someone-else', user_id: 1 });

	assert.equal(response.status, 201);
	const [row] = queryDb('SELECT author, user_id FROM review WHERE id = ?', response.json.review.id);
	assert.equal(row.author, 'real-author');
	assert.notEqual(row.user_id, 1);
});

test('a blank review is still rejected', async () => {
	const client = await register('blank-test');

	const response = await client.post('/api/item_view/6/reviews', { content: '   ' });

	assert.equal(response.status, 422);
});

test('only an admin can delete a review', async () => {
	const owner = await register('delete-test');
	const { json } = await owner.post('/api/item_view/6/reviews', { content: 'Delete me.' });
	const path = `/api/reviews/${json.review.id}`;

	assert.equal((await newClient().delete(path)).status, 401);
	assert.equal((await owner.delete(path)).status, 403);
	assert.equal(queryDb('SELECT id FROM review WHERE id = ?', json.review.id).length, 1);

	// the control: the same request does work for someone allowed to make it
	const admin = await logInAsAdmin();
	assert.equal((await admin.delete(path)).status, 204);
	assert.equal(queryDb('SELECT id FROM review WHERE id = ?', json.review.id).length, 0);
});
