export default {
	// No server rendering: a single-page app. The browser gets one empty page plus the
	// JavaScript, and every route fetches its own data from the API server.
	// Server-only route exports (loader, action, middleware) are now build errors.
	ssr: false,
};
