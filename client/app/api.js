// Where the API server is. This app is served from a different port (8080),
// so every fetch() has to name the server in full -- and the server has to allow it (CORS).
export const API_URL = 'http://localhost:3000';

// Every call goes through here so none of them forgets the session cookie.
// A cross-origin fetch leaves cookies out unless it asks for them with credentials: 'include'.
export function apiFetch(path, options = {}) {
	return fetch(`${API_URL}${path}`, { credentials: 'include', ...options });
}

// POST a JSON body
export function apiPost(path, body) {
	return apiFetch(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}
