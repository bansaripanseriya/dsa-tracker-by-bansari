import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import api from '../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setPending(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login', { replace: true, state: { resetOk: true } });
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.error ||
        'Reset failed';
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-theme-bar">
          <ThemeToggle />
        </div>
        <div className="auth-card">
          <div className="auth-logo">DSA</div>
          <h1>Reset password</h1>
          <p className="auth-sub">This link is missing a token. Request a new reset from the sign-in page.</p>
          <p className="auth-footer">
            <Link to="/forgot-password">Forgot password</Link>
            {' · '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-theme-bar">
        <ThemeToggle />
      </div>
      <div className="auth-card">
        <div className="auth-logo">DSA</div>
        <h1>New password</h1>
        <p className="auth-sub">Choose a new password for your account.</p>
        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <label>
            <span>New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
          </label>
          <label>
            <span>Confirm password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="auth-submit" disabled={pending}>
            {pending ? 'Updating…' : 'Update password'}
          </button>
        </form>
        <p className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
