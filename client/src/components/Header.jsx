import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Header({ note }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="hdr">
      <Link className="logo" to="/">
        <div className="logo-box">DSA</div>
        <span className="logo-name">Complete Sheet</span>
      </Link>
      <div className="hdr-gap" />
      {user && (
        <span className="hdr-user" title={user.email}>
          {user.name || user.email}
        </span>
      )}
      <span className="hdr-note">{note}</span>
      <div className="hdr-actions">
        <ThemeToggle />
        {user && (
          <button type="button" className="hdr-logout" onClick={handleLogout}>
            Log out
          </button>
        )}
      </div>
    </header>
  );
}
