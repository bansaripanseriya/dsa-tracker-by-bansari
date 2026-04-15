import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { calcStreak, countCheckinsCurrentWeek } from '../utils/streak';

function ChevronDown({ className = '' }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconGift() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8M2 7h20v5H2V7zm18-5v5M4 2v5m8-5v5M12 2a3 3 0 0 0-3 3v2h6V5a3 3 0 0 0-3-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 7-3 14h18c0-7-3-7-3-14M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm7.4-2.1.7-1.4-1.7-3 .2-1.6-2.6-1.5-1.4.6-1.3-.6L12 2l-1.4 3-1.3.6-1.4-.6L5.3 6.5l.2 1.6-1.7 3 .7 1.4-.7 1.4 1.7 3-.2 1.6L7.9 20l1.4-.6 1.3.6L12 23l1.4-3 1.3-.6 1.4.6 2.6-1.5-.2-1.6 1.7-3-.7-1.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const RING_R = 14;
const RING_LEN = 2 * Math.PI * RING_R;
const AVATAR_IMAGES = Object.entries(
  import.meta.glob('../assets/avatars/*.{png,jpg,jpeg,webp,svg}', { eager: true, import: 'default' })
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, src]) => src);

export default function Header({ note, activeTab, onTabChange, streak, showNav = false }) {
  const showMainNav = typeof onTabChange === 'function' || showNav;
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(() => {
    const saved = Number(localStorage.getItem('profileAvatarIndex'));
    return Number.isInteger(saved) && saved >= 0 ? saved : 0;
  });

  function handleTabNavigation(nextTab) {
    if (typeof onTabChange === 'function') {
      onTabChange(nextTab);
      return;
    }
    navigate(`/?tab=${nextTab}`);
  }

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [streakOpen, setStreakOpen] = useState(false);
  const streakRef = useRef(null);
  const profileRef = useRef(null);

  const weekCount = useMemo(() => countCheckinsCurrentWeek(streak?.checkins), [streak?.checkins]);
  const streakStats = useMemo(() => calcStreak(streak?.checkins || []), [streak?.checkins]);
  const weekCells = useMemo(() => {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const set = new Set(streak?.checkins || []);
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const sun = new Date(now);
    sun.setDate(now.getDate() - now.getDay());
    return labels.map((label, i) => {
      const d = new Date(sun);
      d.setDate(sun.getDate() + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { label, done: set.has(ds) };
    });
  }, [streak?.checkins]);

  const firstName = useMemo(() => {
    if (!user) return '';
    const raw = user.name || user.email?.split('@')[0] || '';
    return raw.includes('@') ? raw.split('@')[0] : raw.split(/\s+/)[0];
  }, [user]);

  const initial = useMemo(() => {
    if (!user) return '?';
    const ch = (user.name || user.email || '?').trim().charAt(0);
    return ch.toUpperCase();
  }, [user]);

  const weekFrac = Math.min(1, weekCount / 7);
  const streakFrac = streakStats.best > 0 ? Math.min(1, streakStats.current / streakStats.best) : 0;
  const selectedAvatarSrc = AVATAR_IMAGES[selectedAvatarIndex] || '';

  useEffect(() => {
    function readAvatarSelection() {
      const saved = Number(localStorage.getItem('profileAvatarIndex'));
      if (!Number.isInteger(saved)) return;
      const safeIndex = Math.max(0, Math.min(saved, Math.max(0, AVATAR_IMAGES.length - 1)));
      setSelectedAvatarIndex(safeIndex);
    }

    window.addEventListener('profile-avatar-updated', readAvatarSelection);
    window.addEventListener('storage', readAvatarSelection);
    return () => {
      window.removeEventListener('profile-avatar-updated', readAvatarSelection);
      window.removeEventListener('storage', readAvatarSelection);
    };
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (streakOpen && streakRef.current && !streakRef.current.contains(e.target)) {
        setStreakOpen(false);
      }
      if (profileRef.current?.hasAttribute('open') && !profileRef.current.contains(e.target)) {
        profileRef.current.removeAttribute('open');
      }
    }
    function onEsc(e) {
      if (e.key !== 'Escape') return;
      setStreakOpen(false);
      if (profileRef.current?.hasAttribute('open')) {
        profileRef.current.removeAttribute('open');
      }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [streakOpen]);

  function closeProfileMenu() {
    if (profileRef.current?.hasAttribute('open')) {
      profileRef.current.removeAttribute('open');
    }
  }

  function handleSettings() {
    closeProfileMenu();
    navigate('/profile?tab=security-media');
  }

  function handleProfile() {
    closeProfileMenu();
    navigate('/profile');
  }

  function handleLogout() {
    closeProfileMenu();
    logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="hdr">
      <span className="hdr-note-sr">{note}</span>
      <Link className="hdr-brand" to="/">
        <span className="hdr-brand-stack">
          <span className="hdr-brand-line1">DSA</span>
          <span className="hdr-brand-line2">Tracker By B!</span>
        </span>
      </Link>

      {showMainNav && (
        <nav className="hdr-nav" aria-label="Main sections">
          <button type="button" className={`hdr-nav-btn${activeTab === 'sheet' ? ' active' : ''}`} onClick={() => handleTabNavigation('sheet')}>
            <span>Sheet</span>
            <ChevronDown className="hdr-nav-chev" />
          </button>
          <button type="button" className={`hdr-nav-btn practice-tab${activeTab === 'practice' ? ' active' : ''}`} onClick={() => handleTabNavigation('practice')}>
            <span>Practice</span>
            <ChevronDown className="hdr-nav-chev" />
          </button>
          <button type="button" className={`hdr-nav-btn streak-tab${activeTab === 'streak' ? ' active' : ''}`} onClick={() => handleTabNavigation('streak')}>
            <span>Streak</span>
            <ChevronDown className="hdr-nav-chev" />
          </button>
        </nav>
      )}

      <div className="hdr-spacer" />

      {user && firstName && (
        <span className="hdr-greeting">
          Hi, <strong>{firstName}...!!</strong>
        </span>
      )}

      <div className="hdr-icon-row">
        <button type="button" className="hdr-icon-btn" aria-label="Rewards" title="Coming soon">
          <IconGift />
        </button>
        <button type="button" className="hdr-icon-btn" aria-label="Notifications" title="Coming soon">
          <IconBell />
        </button>
        <ThemeToggle compact />
      </div>

      {!user && (
        <div className="hdr-auth-links">
          <Link className="hdr-link" to="/login">
            Sign in
          </Link>
          <Link className="hdr-link hdr-link-primary" to="/register">
            Create account
          </Link>
        </div>
      )}

      <div className="hdr-streak-pop" ref={streakRef}>
        <button
          type="button"
          className="hdr-streak-pill"
          aria-label={`Coding streak this week: ${weekCount} of 7 days`}
          aria-expanded={streakOpen}
          aria-haspopup="dialog"
          onClick={() => setStreakOpen((x) => !x)}
        >
          <span className="hdr-streak-bolt" aria-hidden="true">
            ⚡
          </span>
          <span className="hdr-streak-dot" aria-hidden="true" />
          <span className="hdr-streak-text">
            <span>{weekCount}</span>/7 Coding Streak!
          </span>
          <div className="hdr-avatar-wrap" aria-hidden="true">
            <svg className="hdr-avatar-ring" viewBox="0 0 36 36" width="34" height="34">
              <circle className="bg" cx="18" cy="18" r={RING_R} />
              <circle className="fg" cx="18" cy="18" r={RING_R} strokeDasharray={`${weekFrac * RING_LEN} ${RING_LEN}`} />
            </svg>
            <div className="hdr-avatar-inner">
              {selectedAvatarSrc ? <img src={selectedAvatarSrc} alt="Profile avatar" /> : initial}
            </div>
          </div>
        </button>
        {streakOpen ? (
          <div className="hdr-streak-panel" role="dialog" aria-label="Consistency streak">
            <div className="hdr-streak-panel-title">Consistency Streak</div>
            <div className="hdr-streak-week">
              {weekCells.map((d) => (
                <div key={d.label} className="hdr-streak-day">
                  <span className={`hdr-streak-box${d.done ? ' on' : ''}`} />
                  <span className="hdr-streak-day-lbl">{d.label}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="hdr-streak-link"
              onClick={() => {
                setStreakOpen(false);
                if (typeof onTabChange === 'function') onTabChange('streak');
              }}
            >
              Show Full Streak
            </button>
            <div className="hdr-streak-stats">
              <span>
                Current: <strong>{streakStats.current} days</strong>
              </span>
              <span>
                Best: <strong>{streakStats.best} days</strong>
              </span>
            </div>
            <div className="hdr-streak-progress">
              <span className="hdr-streak-progress-fill" style={{ width: `${Math.round(streakFrac * 100)}%` }} />
            </div>
            <div className="hdr-streak-total">Total Active Days: {streakStats.total}</div>
          </div>
        ) : null}
      </div>

      {user ? (
        <details className="hdr-profile" ref={profileRef}>
          <summary className="hdr-profile-summary" aria-label="Account menu">
            <ChevronDown className="hdr-profile-chev" />
          </summary>
          <div className="hdr-profile-panel">
            <button type="button" className="hdr-menu-item" onClick={handleProfile} title="Coming soon">
              <IconUser />
              <span>My Profile</span>
            </button>
            <button type="button" className="hdr-menu-item" onClick={handleSettings}>
              <IconSettings />
              <span>Setting</span>
            </button>
            <button type="button" className="hdr-menu-item" onClick={handleLogout}>
              <IconLogout />
              <span>Logout</span>
            </button>
          </div>
        </details>
      ) : null}
    </header>
  );
}
