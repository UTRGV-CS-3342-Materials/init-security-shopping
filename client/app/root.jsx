import { useEffect, useState } from 'react';
import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration, useNavigate } from 'react-router';
import { apiFetch, apiPost } from './api.js';

// every URL subdir can have a specially named Layout wrapper
export function Layout({ children }) {
	return (
		<html>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>Incredibly Simple Shopping</title>
				{/* empty inline icon so the browser doesn't request /favicon.ico (no route matches it) */}
				<link rel="icon" href="data:," />
				<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css" />
				<link rel="stylesheet" href="/main.css" />
				<Meta />
				<Links />
			</head>
			<body>
				<div className="container">
					{children}
				</div>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

function NavBar({ user, setUser }) {
	const navigate = useNavigate();

	async function logOut() {
		try {
			await apiPost('/api/logout');
		} catch {
			// can't reach the server: the session lives on there, but forget it here anyway
		}
		setUser(null);
		navigate('/items');
	}

	return (
		<div className="text-right mt-2">
			{user ? (
				<>
					{user.username}
					{user.admin && ' (admin)'} |{' '}
					<button type="button" className="btn btn-link p-0 align-baseline" onClick={logOut}>
						Log out
					</button>
				</>
			) : (
				<>
					<Link to="/login">Log in</Link> | <Link to="/register">Register</Link>
				</>
			)}
		</div>
	);
}

// Outlet is where the dynamic content goes, automatically wrapped in Layout if it exists
export default function App() {
	// who is logged in lives here, at the top, so every page can see it and login/logout can change it.
	// undefined = haven't asked the server yet, null = nobody
	const [user, setUser] = useState(undefined);

	// the browser can't read the HttpOnly session cookie, so the only way to know who we are is to ask
	useEffect(() => {
		let ignore = false;

		(async function load() {
			try {
				const response = await apiFetch('/api/me');
				const body = await response.json();
				if (!ignore) setUser(response.ok ? body.user : null);
			} catch {
				// server unreachable: treat as logged out (the pages will report their own errors)
				if (!ignore) setUser(null);
			}
		})();

		return () => {
			ignore = true;
		};
	}, []);

	// unlike a server-rendered page, the first render doesn't know who is logged in
	if (user === undefined) return <p className="mt-4">Loading...</p>;

	return (
		<>
			<NavBar user={user} setUser={setUser} />
			{/* context: any route below can get these with useOutletContext() */}
			<Outlet context={{ user, setUser }} />
		</>
	);
}
