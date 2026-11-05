import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, rmSync } from 'node:fs';

// The User model has no routes yet, so test it directly, on a scratch copy of the database.
// DB_FILE has to be set before db.js loads, which is why these are import() calls, not imports.
process.env.DB_FILE = 'test.sqlite';
copyFileSync('shopping.sqlite', 'test.sqlite');
const { db } = await import('../db.js');
const { User } = await import('../user.js');

after(() => {
	db.close();
	rmSync('test.sqlite', { force: true });
});

const hashOf = (user) => db.prepare('SELECT password_hash FROM user WHERE id = ?').get(user.id).password_hash;

test('signup saves a hash, not the password', async () => {
	const { user, errors } = await User.signup('sam', 'correct-horse');

	assert.deepEqual(errors, []);
	assert.ok(!hashOf(user).includes('correct-horse'));
});

test('the same password hashes differently for two users', async () => {
	const a = (await User.signup('same-a', 'same-password')).user;
	const b = (await User.signup('same-b', 'same-password')).user;

	assert.notEqual(hashOf(a), hashOf(b));
});

test('login needs the right password', async () => {
	await User.signup('lee', 'correct-horse');

	assert.equal((await User.login('lee', 'correct-horse')).username, 'lee');
	assert.equal(await User.login('lee', 'wrong-password'), null);
	assert.equal(await User.login('nobody', 'correct-horse'), null);
});

test('signup rejects a taken username and a short password', async () => {
	await User.signup('taken', 'correct-horse');

	assert.equal((await User.signup('taken', 'correct-horse')).user, null);
	assert.equal((await User.signup('short', 'abc')).user, null);
});

test('the hash does not come along when a user becomes JSON', async () => {
	const { user } = await User.signup('json', 'correct-horse');

	assert.ok(!JSON.stringify(user).includes(user.password_hash));
});
