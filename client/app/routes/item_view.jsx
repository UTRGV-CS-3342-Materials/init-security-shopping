import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { API_URL } from '../api.js';
import { ItemView } from '../ItemView.jsx';

export default function ItemViewRoute() {
	// the :item_id part of the URL, read in the browser now
	const { item_id } = useParams();

	const [data, setData] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		let ignore = false;

		(async function load() {
			try {
				const response = await fetch(`${API_URL}/api/item_view/${item_id}`);
				// a bad id used to be the loader's thrown 404; now it's just a reply we have to check
				if (!response.ok) {
					if (!ignore) setError(response.status === 404 ? 'No such item.' : 'Could not load the item.');
					return;
				}
				const body = await response.json();
				if (!ignore) setData(body);
			} catch {
				// network down
				if (!ignore) setError('Could not load the item.');
			}
		})();

		return () => {
			ignore = true;
		};
		// run again if the id in the URL changes
	}, [item_id]);

	if (error) {
		return (
			<p className="mt-4">
				{error} (<Link to="/items">back</Link>)
			</p>
		);
	}
	if (!data) return <p className="mt-4">Loading...</p>;

	// a different item is a different ItemView: its useState(reviews) starts over
	return <ItemView key={data.item.id} {...data} />;
}
