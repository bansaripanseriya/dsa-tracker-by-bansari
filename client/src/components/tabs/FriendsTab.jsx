import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { friendsApi } from '../../api/friends';
import { useAuth } from '../../context/AuthContext';
import { useLoader } from '../../hooks/useLoader';
import Leaderboard from '../friends/Leaderboard';
import FriendRequests from '../friends/FriendRequests';
import FriendsList from '../friends/FriendsList';
import { FRIENDS_CHANGED, copyText, inviteLink } from '../../utils/friends';

const NAME_NOTE_KEY = 'dsa-friends-name-note-dismissed';

function GuestFriends() {
  return (
    <section className="dash-card fr-card fr-empty" aria-labelledby="fr-guest-title">
      <span className="fr-empty-icon" aria-hidden="true">
        👥
      </span>
      <h2 id="fr-guest-title" className="fr-card-title">
        Race your friends every week
      </h2>
      <p className="fr-muted">Sign in to add friends, see their streaks and join the weekly leaderboard. Anything you've ticked as a guest comes with you.</p>
      <div className="fr-actions center">
        <Link className="btn-checkin fr-btn" to="/login">
          Sign in
        </Link>
        <Link className="pill fr-btn" to="/register">
          Create account
        </Link>
      </div>
    </section>
  );
}

function EmptyFriends({ onCopy, copied }) {
  return (
    <section className="dash-card fr-card fr-empty" aria-labelledby="fr-empty-title">
      <h2 id="fr-empty-title" className="fr-card-title">
        It's just you on the board for now
      </h2>
      <p className="fr-muted">Add a friend or share your invite link. Once they accept, you'll see each other's points, streaks and progress here.</p>
      <div className="fr-actions center">
        <Link className="btn-checkin fr-btn" to="/friends/find">
          Add friend
        </Link>
        <button type="button" className="pill fr-btn" onClick={onCopy}>
          {copied ? 'Invite link copied' : 'Copy invite link'}
        </button>
      </div>
    </section>
  );
}

/** One-time heads-up that name search is on by default (opt-out). Remembered in this browser only. */
function NameSearchNote({ byName }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(NAME_NOTE_KEY) === '1';
    } catch {
      return true;
    }
  });
  if (dismissed || !byName) return null;
  function dismiss() {
    try {
      localStorage.setItem(NAME_NOTE_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }
  return (
    <div className="fr-note" role="note">
      <span>
        People can now find you by your name. <Link to="/friends/find#who-can-find-you">Change this</Link>
      </span>
      <button type="button" className="fr-note-close" aria-label="Dismiss" onClick={dismiss}>
        ×
      </button>
    </div>
  );
}

export default function FriendsTab({ authenticated }) {
  const { user, discoverability } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const bump = () => setReloadKey((k) => k + 1);
    window.addEventListener(FRIENDS_CHANGED, bump);
    return () => window.removeEventListener(FRIENDS_CHANGED, bump);
  }, []);

  const lists = useLoader(
    () => (authenticated ? Promise.all([friendsApi.friends(), friendsApi.requests()]) : Promise.resolve(null)),
    [authenticated, reloadKey]
  );

  async function copyInvite() {
    if (!user?.friendTag) return;
    if (await copyText(inviteLink(user.friendTag))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!authenticated) {
    return (
      <div className="fr-page">
        <GuestFriends />
      </div>
    );
  }

  const [friends = [], requests = { incoming: [], outgoing: [] }] = lists.data || [];

  return (
    <div className="fr-page">
      <div className="fr-page-head">
        <div>
          <h1 className="fr-title">Friends</h1>
          <p className="fr-muted">See how your friends are doing and race for the top spot each week.</p>
        </div>
        <div className="fr-actions">
          <button type="button" className="pill fr-btn" onClick={copyInvite} disabled={!user?.friendTag}>
            {copied ? 'Invite link copied' : 'Copy invite link'}
          </button>
          <Link className="btn-checkin fr-btn" to="/friends/find">
            Add friend
          </Link>
        </div>
      </div>

      <NameSearchNote byName={discoverability?.byName !== false} />

      <div className="fr-layout">
        <div className="fr-main">
          <Leaderboard reloadKey={reloadKey} />
        </div>
        <aside className="fr-side">
          {lists.error ? (
            <div className="dash-card fr-card fr-error" role="alert">
              Could not load your friends.{' '}
              <button type="button" className="pill" onClick={lists.reload}>
                Try again
              </button>
            </div>
          ) : !lists.data ? (
            <p className="fr-muted fr-loading">Loading friends…</p>
          ) : (
            <>
              <FriendRequests incoming={requests.incoming} outgoing={requests.outgoing} />
              {friends.length ? <FriendsList friends={friends} /> : <EmptyFriends onCopy={copyInvite} copied={copied} />}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
