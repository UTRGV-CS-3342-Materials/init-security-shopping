import { useEffect, useState } from 'react';
import { API_URL } from '../api.js';
import { Items } from '../Items.jsx';

// whatever function is default exported is considered the render function
// it is a react component, returning a react tree
export default function ItemsRoute() {
	// no loader: the page draws first with nothing, then fills in when the data arrives
	const [data, setData] = useState(null);
	const [error, setError] = useState(null);

	// runs after the first render, not during it. [] means never again.
	useEffect(() => {
		// set by the cleanup below: this render's answer is no longer wanted
		// (in development, React runs every effect twice on purpose to catch exactly this)
		let ignore = false;

		// the effect function itself can't be async (it may only return a cleanup function),
		// so the awaiting happens in an async function defined and called at once (an IIFE)
		(async function load() {
			try {
				const response = await fetch(`${API_URL}/api/items`);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const body = await response.json();
				if (!ignore) setData(body);
			} catch {
				if (!ignore) setError('Could not load the items.');
			}
		})();

		return () => {
			ignore = true;
		};
	}, []);

	if (error) return <p className="mt-4">{error}</p>;
	if (!data) return <p className="mt-4">Loading...</p>;

	// spread syntax (...) used to pass each key/value pair as an attribute
	return <Items {...data} />;
}
