import { Navigate } from 'react-router';

// no loader to redirect from anymore: the browser's router does it
export default function Home() {
	return <Navigate to="/items" replace />;
}
