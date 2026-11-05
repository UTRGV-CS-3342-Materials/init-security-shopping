import { AuthForm } from '../AuthForm.jsx';

export default function Login() {
	return <AuthForm title="Log in" path="/api/login" submitLabel="Log in" />;
}
