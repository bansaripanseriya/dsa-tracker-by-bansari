import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TOTALS } from '@shared/problemIndex.js';
import FriendAvatar from './FriendAvatar';
import { displayName, relativeDay } from '../../utils/friends';

export default function FriendsList({ friends }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return friends;
    return friends.filter((f) => displayName(f).toLowerCase().includes(needle) || f.tag.toLowerCase().includes(needle.replace(/^#/, '')));
  }, [friends, q]);

  return (
    <section className="dash-card fr-card" aria-labelledby="fr-list-title">
      <div className="fr-card-head">
        <h2 id="fr-list-title" className="fr-card-title">
          Friends
        </h2>
        <span className="fr-muted fr-count">{friends.length}</span>
      </div>
      {friends.length > 4 ? (
        <input className="search fr-filter" type="search" placeholder="Search friends" aria-label="Search friends" value={q} onChange={(e) => setQ(e.target.value)} />
      ) : null}
      <ul className="fr-list">
        {shown.map((f) => (
          <li key={f.tag}>
            <Link className="fr-friend" to={`/friends/${f.tag}`}>
              <FriendAvatar person={f} />
              <span className="fr-friend-body">
                <span className="fr-friend-top">
                  <span className="fr-name">{displayName(f)}</span>
                  <span className={`fr-streak${f.streak ? '' : ' none'}`} title={f.streak ? `${f.streak}-day streak` : 'No active streak'}>
                    ⚡ {f.streak ? `${f.streak}d` : '—'}
                  </span>
                </span>
                <span className="fr-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(1, (f.totalSolved / TOTALS.all) * 100)}%` }} />
                </span>
                <span className="fr-tag">
                  {f.totalSolved} / {TOTALS.all.toLocaleString('en-IN')} solved · active {relativeDay(f.lastCheckin)}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {!shown.length ? <li className="fr-muted">No friends match “{q}”.</li> : null}
      </ul>
    </section>
  );
}
