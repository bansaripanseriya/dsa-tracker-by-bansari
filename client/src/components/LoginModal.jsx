import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function LoginModal({ open, title, onClose, onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setPassword('');
      setError('');
      setPending(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Sign in failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-root" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <button type="button" className="modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className="modal-panel">
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <div className="auth-logo modal-logo">DSA</div>
        <h2 id="login-modal-title">{title || 'Sign in to save progress'}</h2>
        <p className="auth-sub modal-sub">Use your account to sync marks and streak across devices.</p>
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
              autoFocus
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
          <div className="auth-forgot-row modal-forgot-row">
            <Link to="/forgot-password" className="auth-forgot" onClick={onClose}>
              Forgot password?
            </Link>
          </div>
          <button type="submit" className="auth-submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-footer">
          No account? <Link to="/register" onClick={onClose}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
