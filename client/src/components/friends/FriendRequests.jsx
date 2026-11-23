import { useState } from 'react';
import { friendsApi } from '../../api/friends';
import FriendAvatar from './FriendAvatar';
import { displayName, errorMessage, formatTag, notifyFriendsChanged } from '../../utils/friends';

/** Incoming requests (accept / decline) and sent ones (cancel). Hidden when there are none. */
export default function FriendRequests({ incoming = [], outgoing = [] }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  if (!incoming.length && !outgoing.length) return null;

  async function act(tag, action) {
    setBusy(tag);
    setError('');
    try {
      if (action === 'accept') await friendsApi.accept(tag);
      else await friendsApi.removeRequest(tag);
      notifyFriendsChanged(); // the tab reloads requests, friends and the leaderboard
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="dash-card fr-card" aria-labelledby="fr-req-title">
      <h2 id="fr-req-title" className="fr-card-title">
        Friend requests
      </h2>
      {error ? (
        <p className="fr-error" role="alert">
          {error}
        </p>
      ) : null}
      {incoming.length ? (
        <ul className="fr-list">
          {incoming.map((p) => (
            <li key={p.tag} className="fr-request">
              <div className="fr-person">
                <FriendAvatar person={p} />
                <span className="fr-who">
                  <span className="fr-name">{displayName(p)}</span>
                  <span className="fr-tag">
                    {formatTag(p.tag)} · {p.totalSolved} solved
                  </span>
                </span>
              </div>
              <div className="fr-actions">
                <button type="button" className="btn-checkin fr-btn" disabled={busy === p.tag} onClick={() => act(p.tag, 'accept')}>
                  Accept
                </button>
                <button type="button" className="pill fr-btn" disabled={busy === p.tag} onClick={() => act(p.tag, 'decline')}>
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {outgoing.length ? (
        <>
          <span className="fr-subhead">Sent</span>
          <ul className="fr-list">
            {outgoing.map((p) => (
              <li key={p.tag} className="fr-request sent">
                <div className="fr-person">
                  <FriendAvatar person={p} />
                  <span className="fr-who">
                    <span className="fr-name">{displayName(p)}</span>
                    <span className="fr-tag">{formatTag(p.tag)} · waiting for them</span>
                  </span>
                </div>
                <button type="button" className="pill fr-btn" disabled={busy === p.tag} onClick={() => act(p.tag, 'cancel')}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
