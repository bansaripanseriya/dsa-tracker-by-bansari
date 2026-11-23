import { useState } from 'react';
import { Link } from 'react-router-dom';
import { friendsApi } from '../../api/friends';
import { useLoader } from '../../hooks/useLoader';
import FriendAvatar from './FriendAvatar';
import { displayName, errorMessage, firstName, formatTag, formatWeekRange, leaderboardNudge } from '../../utils/friends';

const MAX_WEEKS_BACK = 8;

function MoveArrow({ change }) {
  if (change == null) return <span className="fr-move" aria-hidden="true" />;
  if (change > 0)
    return (
      <span className="fr-move up" title={`Up ${change} since last week`}>
        ▲<span className="fr-sr">up {change}</span>
      </span>
    );
  if (change < 0)
    return (
      <span className="fr-move down" title={`Down ${-change} since last week`}>
        ▼<span className="fr-sr">down {-change}</span>
      </span>
    );
  return (
    <span className="fr-move same" title="Same place as last week">
      –<span className="fr-sr">no change</span>
    </span>
  );
}

function DifficultyChips({ row }) {
  return (
    <span className="fr-chips">
      <span className="db Easy" title="Easy solved">E {row.easy}</span>
      <span className="db Medium" title="Medium solved">M {row.medium}</span>
      <span className="db Hard" title="Hard solved">H {row.hard}</span>
    </span>
  );
}

function Podium({ rows }) {
  const [first, second, third] = rows;
  const order = [second, first, third].filter(Boolean);
  return (
    <div className="fr-podium">
      {order.map((r) => (
        <div key={r.tag} className={`fr-podium-spot rank-${Math.min(r.rank, 3)}${r === first ? ' first' : ''}${r.isMe ? ' me' : ''}`}>
          <span className="fr-medal">{r.rank}</span>
          <FriendAvatar person={r} size={r === first ? 56 : 46} />
          <span className="fr-podium-name">{r.isMe ? 'You' : firstName(r)}</span>
          <span className="fr-podium-pts">
            {r.points}
            <small> pts</small>
          </span>
          <span className="fr-podium-split">
            E {r.easy} · M {r.medium} · H {r.hard}
          </span>
        </div>
      ))}
    </div>
  );
}

/** The weekly leaderboard card. `reloadKey` changes → refetch (e.g. after a friend request is accepted). */
export default function Leaderboard({ reloadKey = 0 }) {
  const [offset, setOffset] = useState(0);
  const { data: board, error, loading, reload } = useLoader(() => friendsApi.leaderboard(offset), [offset, reloadKey]);

  return (
    <section className="dash-card fr-card fr-leaderboard" aria-labelledby="fr-lb-title">
      <div className="fr-card-head">
        <div>
          <h2 id="fr-lb-title" className="fr-card-title">
            Weekly leaderboard
          </h2>
          <span className={`fr-week-status${board?.week.live ? ' live' : ''}`}>
            {board ? (board.week.live ? 'Live · resets Monday 00:00 IST' : 'Final standings') : ' '}
          </span>
        </div>
        <div className="fr-week-nav" role="group" aria-label="Choose week">
          <button type="button" className="pill" aria-label="Previous week" disabled={offset >= MAX_WEEKS_BACK} onClick={() => setOffset((o) => o + 1)}>
            ‹
          </button>
          <span className="fr-week-label">{board ? formatWeekRange(board.week.start, board.week.end) : '…'}</span>
          <button type="button" className="pill" aria-label="Next week" disabled={offset === 0} onClick={() => setOffset((o) => o - 1)}>
            ›
          </button>
        </div>
      </div>

      <div className="fr-legend">
        <span className="db Easy">Easy +5</span>
        <span className="db Medium">Medium +10</span>
        <span className="db Hard">Hard +15</span>
        <span className="fr-muted">Each problem counts once, the week you first tick it.</span>
      </div>

      {error ? (
        <div className="fr-error" role="alert">
          {errorMessage(error, 'Could not load the leaderboard.')}{' '}
          <button type="button" className="pill" onClick={reload}>
            Try again
          </button>
        </div>
      ) : !board ? (
        <p className="fr-muted fr-loading">Loading leaderboard…</p>
      ) : (
        <>
          {board.rows.length >= 3 ? <Podium rows={board.rows} /> : null}
          <ol className={`fr-rows${loading ? ' is-loading' : ''}`} aria-label="Rankings">
            {board.rows.map((r) => {
              const content = (
                <>
                  <span className="fr-rank">{r.rank}</span>
                  <MoveArrow change={r.rankChange} />
                  <FriendAvatar person={r} />
                  <span className="fr-who">
                    <span className="fr-name">{r.isMe ? 'You' : displayName(r)}</span>
                    <span className="fr-tag">{formatTag(r.tag)}</span>
                  </span>
                  <DifficultyChips row={r} />
                  <span className="fr-points">
                    {r.points}
                    <small> pts</small>
                  </span>
                </>
              );
              return (
                <li key={r.tag}>
                  {r.isMe ? (
                    <div className="fr-row me" aria-label={`You: rank ${r.rank}, ${r.points} points`}>
                      {content}
                    </div>
                  ) : (
                    <Link className="fr-row" to={`/friends/${r.tag}`} aria-label={`${displayName(r)}: rank ${r.rank}, ${r.points} points`}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="fr-nudge">{leaderboardNudge(board)}</p>
        </>
      )}
    </section>
  );
}
