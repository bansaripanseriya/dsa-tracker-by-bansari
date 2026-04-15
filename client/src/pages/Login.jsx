import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { mergeGuestProgressAfterAuth } from '../utils/guestProgress';

export default function Login() {
  const { login, setProgress } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      await login(email, password);
      await mergeGuestProgressAfterAuth(api, setProgress);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-theme-bar">
        <ThemeToggle />
      </div>
      <div className="auth-card">
        <div className="auth-logo">DSA</div>
        <h1>Sign in</h1>
        <p className="auth-sub">Use your account to sync progress across devices.</p>
        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="auth-submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-footer">
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
