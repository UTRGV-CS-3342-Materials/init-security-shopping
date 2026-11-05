import { useState } from 'react';
import { Navigate, useNavigate, useOutletContext } from 'react-router';
import { apiPost } from './api.js';

// Login and register are the same form sent to different API routes.
export function AuthForm({ title, path, submitLabel }) {
	const { user, setUser } = useOutletContext();
	const navigate = useNavigate();
	const [errors, setErrors] = useState([]);
	const [sending, setSending] = useState(false);

	// already logged in: nothing to do here
	if (user) return <Navigate to="/items" replace />;

	async function submit(event) {
		event.preventDefault();
		const form = event.currentTarget;
		const username = form.elements.username.value;
		const password = form.elements.password.value;

		// not optimistic: until the server says yes, we don't know who this is
		setSending(true);
		setErrors([]);
		try {
			const response = await apiPost(path, { username, password });
			const body = await response.json();
			if (!response.ok) {
				setErrors(body.errors);
				// keep the username, make them retype the password
				form.elements.password.value = '';
				return;
			}
			// the server set the session cookie; the user object is just for showing the page
			setUser(body.user);
			navigate('/items');
		} catch {
			setErrors(['Could not reach the server. Please try again.']);
		} finally {
			setSending(false);
		}
	}

	return (
		<div className="row mt-4">
			<div className="col-4">
				<h1>{title}</h1>
				<form onSubmit={submit}>
					{errors.length > 0 && (
						<div className="alert alert-danger">
							<ul className="mb-0">
								{errors.map((error) => (
									<li key={error}>{error}</li>
								))}
							</ul>
						</div>
					)}
					<div className="form-group">
						<input className="form-control" name="username" placeholder="Username" autoComplete="username" />
					</div>
					<div className="form-group">
						<input className="form-control" name="password" type="password" placeholder="Password" />
					</div>
					<button type="submit" className="btn btn-primary" disabled={sending}>
						{submitLabel}
					</button>
				</form>
			</div>
		</div>
	);
}
