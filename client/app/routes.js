import { index, route } from '@react-router/dev/routes';

// Routing is now data, not a sequence of app.get() calls.
// With ssr off, only the browser's router uses it.
export default [
	index('routes/home.jsx'),
	route('items', 'routes/items.jsx'),
	route('item_view/:item_id', 'routes/item_view.jsx'),
];
