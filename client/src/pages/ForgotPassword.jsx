import { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import api from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setDoneMessage(data?.message || 'Request received.');
      setEmailEnabled(Boolean(data?.emailEnabled));
      setDone(true);
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.error ||
        'Something went wrong';
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
        <h1>Reset password</h1>
        <p className="auth-sub">
          Enter the email you used to register. If it matches an account, you will get reset instructions.
        </p>
        {done ? (
          <>
            {emailEnabled ? (
              <>
                <p className="auth-success-msg">{doneMessage}</p>
                <p className="auth-sub auth-dev-hint">
                  If you have an account, check your inbox and spam folder. The link expires in about one hour.
                </p>
              </>
            ) : (
              <>
                <p className="auth-success-msg">
                  This server is not set up to send email yet, so no message was delivered to your inbox.
                </p>
                <p className="auth-sub auth-dev-hint">
                  Add SMTP settings to <code className="auth-code-inline">.env</code> (see{' '}
                  <code className="auth-code-inline">.env.example</code>). For local development, the reset link is
                  printed in the terminal where the API is running.
                </p>
              </>
            )}
            <p className="auth-footer" style={{ marginTop: 12 }}>
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
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
            <button type="submit" className="auth-submit" disabled={pending}>
              {pending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        {!done && (
          <p className="auth-footer">
            Remembered it? <Link to="/login">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
