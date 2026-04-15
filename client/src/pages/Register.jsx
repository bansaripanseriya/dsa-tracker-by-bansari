import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { mergeGuestProgressAfterAuth } from '../utils/guestProgress';

export default function Register() {
  const { register, setProgress } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setPending(true);
    try {
      await register(email, password, name.trim() || undefined);
      await mergeGuestProgressAfterAuth(api, setProgress);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed';
      setError(msg);
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
        <h1>Create account</h1>
        <p className="auth-sub">Your progress will be stored in your profile.</p>
        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <label>
            <span>Name (optional)</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </label>
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
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="auth-submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
