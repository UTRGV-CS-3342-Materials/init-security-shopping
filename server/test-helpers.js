// Test setup: runs the real server against a scratch copy of the database,
// and talks to it over HTTP, the same way a browser or curl would.

import { spawn } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';
import Database from 'better-sqlite3';

const PORT = 3999;
const BASE_URL = `http://localhost:${PORT}`;
const TEST_DB = 'test.sqlite';

// Starts the server. Returns a function that stops it and deletes the scratch database.
export async function startServer(extraEnv = {}) {
	copyFileSync('shopping.sqlite', TEST_DB);

	const server = spawn('node', ['index.js'], {
		env: { ...process.env, PORT, DB_FILE: TEST_DB, FAKE_LATENCY_MS: 0, ...extraEnv },
		stdio: ['ignore', 'ignore', 'inherit'],
	});
	const exited = new Promise((resolve) => server.once('exit', resolve));

	// wait until it answers
	for (let tries = 0; ; tries++) {
		try {
			await fetch(`${BASE_URL}/api/items`);
			break;
		} catch {
			if (tries === 50) throw new Error('The server did not start.');
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	return async function stopServer() {
		server.kill();
		await exited;
		rmSync(TEST_DB, { force: true });
	};
}

// Something that sends requests. Like a browser, it keeps the cookie it is given and sends it back.
// Each newClient() has its own cookie, so each one can be a different person.
export function newClient() {
	let cookie = null;

	async function request(method, path, body, headers = {}) {
		const response = await fetch(BASE_URL + path, {
			method,
			headers: {
				...(body !== undefined && { 'Content-Type': 'application/json' }),
				...(cookie && { Cookie: cookie }),
				...headers,
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});

		for (const setCookie of response.headers.getSetCookie()) {
			const [pair] = setCookie.split(';');
			// an empty value is how a server clears a cookie
			cookie = pair.endsWith('=') ? null : pair;
		}

		const text = await response.text();
		let json = null;
		try {
			json = JSON.parse(text);
		} catch {
			// not every response has a JSON body
		}
		return { status: response.status, headers: response.headers, text, json };
	}

	return {
		get: (path) => request('GET', path),
		post: (path, body, headers) => request('POST', path, body, headers),
		put: (path, body) => request('PUT', path, body),
		delete: (path) => request('DELETE', path),
		getCookie: () => cookie,
		setCookie: (value) => {
			cookie = value;
		},
	};
}

// Look at what's really in the database, not just what the server says
export function queryDb(sql, ...params) {
	const db = new Database(TEST_DB, { readonly: true });
	try {
		return db.prepare(sql).all(...params);
	} finally {
		db.close();
	}
}
