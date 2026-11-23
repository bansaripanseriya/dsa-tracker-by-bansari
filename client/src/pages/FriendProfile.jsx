import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import FriendAvatar from '../components/friends/FriendAvatar';
import { friendsApi } from '../api/friends';
import { useLoader } from '../hooks/useLoader';
import { leetCodeProblemUrl } from '../utils/leetcode';
import { addDays, localDateStr } from '@shared/streak.js';
import { POINTS } from '@shared/scoring.js';
import {
  displayName,
  errorMessage,
  firstName,
  formatDate,
  formatSolvedAt,
  formatTag,
  notifyFriendsChanged,
  relativeDay
} from '../utils/friends';

const HEATMAP_WEEKS = 26;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Columns = weeks (Mon→Sun), the last column is this week. */
function buildHeatmap(checkins, today) {
  const set = new Set(checkins);
  const [y, m, d] = today.split('-').map(Number);
  const mondayOffset = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const start = addDays(addDays(today, -mondayOffset), -7 * (HEATMAP_WEEKS - 1));
  const columns = [];
  const months = [];
  let lastMonth = null;
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const cells = [];
    for (let r = 0; r < 7; r++) {
      const ds = addDays(start, w * 7 + r);
      cells.push({ ds, done: set.has(ds), future: ds > today });
    }
    const month = Number(cells[0].ds.slice(5, 7)) - 1;
    if (month !== lastMonth && w < HEATMAP_WEEKS - 2) months.push({ col: w + 1, label: MONTHS[month] });
    lastMonth = month;
    columns.push(cells);
  }
  return { columns, months };
}

function CompareBars({ label, difficulty, you, them, max }) {
  const pct = (n) => `${max ? Math.round((n / max) * 100) : 0}%`;
  return (
    <div className="fr-compare">
      <span className={`fr-compare-label ${difficulty}`}>
        {label} <span className="fr-muted">· {POINTS[difficulty]} pts each</span>
      </span>
      <div className="fr-compare-row">
        <span className="fr-compare-track">
          <span className="you" style={{ width: pct(you) }} />
        </span>
        <span className="fr-compare-n">{you}</span>
      </div>
      <div className="fr-compare-row">
        <span className="fr-compare-track">
          <span className="them" style={{ width: pct(them) }} />
        </span>
        <span className="fr-compare-n">{them}</span>
      </div>
    </div>
  );
}

export default function FriendProfile() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const { data, error, loading } = useLoader(() => Promise.all([friendsApi.profile(tag), friendsApi.leaderboard(0)]), [tag]);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const [profile, board] = data || [];
  const today = localDateStr();
  const heat = useMemo(() => buildHeatmap(profile?.checkins || [], today), [profile, today]);

  async function removeFriend() {
    setRemoving(true);
    setRemoveError('');
    try {
      await friendsApi.unfriend(profile.tag);
      notifyFriendsChanged();
      navigate('/?tab=friends', { replace: true });
    } catch (err) {
      setRemoveError(errorMessage(err));
      setRemoving(false);
    }
  }

  const notFound = error?.response?.status === 404;
  let body;
  if (loading && !data) {
    body = <p className="fr-muted fr-loading">Loading profile…</p>;
  } else if (error) {
    body = (
      <section className="dash-card fr-card fr-empty">
        <h1 className="fr-card-title">{notFound ? 'This profile isn’t available' : 'Could not load this profile'}</h1>
        <p className="fr-muted">
          {notFound ? 'You can only see the profiles of your friends.' : errorMessage(error)}
        </p>
        <div className="fr-actions center">
          <Link className="btn-checkin fr-btn" to="/friends/find">
            Find friends
          </Link>
          <Link className="pill fr-btn" to="/?tab=friends">
            Back to Friends
          </Link>
        </div>
      </section>
    );
  } else {
    const me = board?.me || { easy: 0, medium: 0, hard: 0, points: 0 };
    const them = profile.thisWeek;
    const maxCount = Math.max(1, me.easy, me.medium, me.hard, them.easy, them.medium, them.hard);
    const gap = them.points - me.points;
    const name = firstName(profile);
    const s = profile.solved;
    const pct = (n, total) => `${total ? Math.round((n / total) * 1000) / 10 : 0}%`;

    body = (
      <>
        <section className="dash-card fr-card fr-profile-head" aria-label={displayName(profile)}>
          <FriendAvatar person={profile} size={76} />
          <div className="fr-profile-id">
            <h1 className="fr-title">{displayName(profile)}</h1>
            <span className="fr-muted">
              <span className="fr-tag">{formatTag(profile.tag)}</span> · Friends since {formatDate(profile.friendsSince)} · Active {relativeDay(profile.lastCheckin)}
            </span>
            {them.rank ? (
              <span className="fr-rank-chip">
                #{them.rank} of {them.of} this week
              </span>
            ) : null}
          </div>
          <div className="fr-profile-actions">
            {!confirming ? (
              <button type="button" className="pill fr-btn" onClick={() => setConfirming(true)}>
                Remove friend
              </button>
            ) : (
              <div className="fr-confirm" role="group" aria-label="Confirm remove">
                <span>Remove {name}? You'll leave each other's leaderboard.</span>
                <div className="fr-actions">
                  <button type="button" className="fr-btn fr-danger" disabled={removing} onClick={removeFriend}>
                    Remove
                  </button>
                  <button type="button" className="pill fr-btn" disabled={removing} onClick={() => setConfirming(false)}>
                    Keep
                  </button>
                </div>
                {removeError ? <span className="fr-error">{removeError}</span> : null}
              </div>
            )}
          </div>
        </section>

        <div className="stats fr-stats">
          <div className="st">
            <div className="st-lbl">Current streak</div>
            <div className="st-val">{profile.streak.current}</div>
            <div className="st-sub">days</div>
          </div>
          <div className="st">
            <div className="st-lbl">Best streak</div>
            <div className="st-val">{profile.streak.best}</div>
            <div className="st-sub">days · {profile.streak.activeDays} active days in total</div>
          </div>
          <div className="st">
            <div className="st-lbl">Problems solved</div>
            <div className="st-val">{s.total}</div>
            <div className="st-sub">
              of {s.outOf.all.toLocaleString('en-IN')} · {pct(s.total, s.outOf.all)}
            </div>
          </div>
          <div className="st">
            <div className="st-lbl">This week</div>
            <div className="st-val">{them.points}</div>
            <div className="st-sub">pts{them.rank ? ` · #${them.rank} of ${them.of}` : ''}</div>
          </div>
        </div>

        <div className="fr-layout">
          <section className="dash-card fr-card fr-main" aria-labelledby="fr-h2h">
            <div className="fr-card-head">
              <h2 id="fr-h2h" className="fr-card-title">
                This week: you vs {name}
              </h2>
            </div>
            <div className="fr-compare-legend">
              <span>
                <i className="you" /> You
              </span>
              <span>
                <i className="them" /> {name}
              </span>
            </div>
            <CompareBars label="Easy" difficulty="Easy" you={me.easy} them={them.easy} max={maxCount} />
            <CompareBars label="Medium" difficulty="Medium" you={me.medium} them={them.medium} max={maxCount} />
            <CompareBars label="Hard" difficulty="Hard" you={me.hard} them={them.hard} max={maxCount} />
            <div className="fr-compare-total">
              <span>Points</span>
              <span className="fr-points">
                {me.points} <small>vs</small> {them.points}
              </span>
            </div>
            <p className="fr-muted">
              {gap > 0 ? `${name} is ${gap} pts ahead this week.` : gap < 0 ? `You're ${-gap} pts ahead of ${name} this week.` : `You and ${name} are level this week.`}
            </p>
          </section>

          <section className="dash-card fr-card fr-side" aria-labelledby="fr-diff">
            <h2 id="fr-diff" className="fr-card-title">
              Solved by difficulty
            </h2>
            {[
              ['Easy', s.easy, s.outOf.easy],
              ['Medium', s.medium, s.outOf.medium],
              ['Hard', s.hard, s.outOf.hard]
            ].map(([d, n, total]) => (
              <div key={d} className="fr-diff-row">
                <div className="fr-diff-top">
                  <span className={`fr-compare-label ${d}`}>{d}</span>
                  <span className="fr-count">
                    {n} / {total} <span className="fr-muted">· {pct(n, total)}</span>
                  </span>
                </div>
                <span className={`fr-bar ${d}`}>
                  <span style={{ width: pct(n, total) }} />
                </span>
              </div>
            ))}
            <p className="fr-muted fr-small">Unique LeetCode problems — a problem listed under two topics counts once.</p>
          </section>
        </div>

        <section className="dash-card fr-card" aria-labelledby="fr-heat">
          <div className="fr-card-head">
            <h2 id="fr-heat" className="fr-card-title">
              Check-ins
            </h2>
            <span className="fr-muted">{profile.checkins.length} active days in the last 26 weeks</span>
          </div>
          <div className="fr-heat-scroll">
            <div className="fr-heat-wrap">
              <div className="fr-heat-days" aria-hidden="true">
                <span />
                <span>Mon</span>
                <span />
                <span>Wed</span>
                <span />
                <span>Fri</span>
                <span />
              </div>
              <div>
                <div className="fr-heat-months" aria-hidden="true">
                  {heat.months.map((m) => (
                    <span key={`${m.col}-${m.label}`} style={{ gridColumn: `${m.col} / span 3` }}>
                      {m.label}
                    </span>
                  ))}
                </div>
                <div className="fr-heat" role="img" aria-label={`${profile.checkins.length} active days in the last 26 weeks; current streak ${profile.streak.current} days`}>
                  {heat.columns.flat().map((c) => (
                    <span key={c.ds} className={`gh-cell${c.done ? ' on' : ''}${c.future ? ' out' : ''}`} title={c.future ? '' : `${c.ds}${c.done ? ' — checked in' : ''}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="dash-card fr-card" aria-labelledby="fr-recent">
          <div className="fr-card-head">
            <h2 id="fr-recent" className="fr-card-title">
              Recent solves
            </h2>
          </div>
          {profile.recentSolves.length ? (
            <ul className="fr-list">
              {profile.recentSolves.map((p) => (
                <li key={p.lcNumber} className="fr-solve">
                  <span className="fr-solve-date">{formatSolvedAt(p.solvedAt)}</span>
                  <span className="fr-tag">#{p.lcNumber}</span>
                  <a className="fr-solve-name" href={leetCodeProblemUrl(p.lcNumber, p.name)} target="_blank" rel="noopener noreferrer">
                    {p.name}
                  </a>
                  <span className={`db ${p.difficulty}`}>{p.difficulty}</span>
                  <span className="fr-solve-pts">+{p.points}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fr-muted">No problems ticked since the leaderboard started.</p>
          )}
        </section>

        <p className="fr-muted fr-small">🔒 Friends see your stats, streaks and solved problems. Notes, resume and email always stay private.</p>
      </>
    );
  }

  return (
    <>
      <Header note="Friend profile" showNav activeTab="friends" />
      <div className="fr-page">
        <Link className="fr-back" to="/?tab=friends">
          ‹ Back to Friends
        </Link>
        {body}
      </div>
    </>
  );
}
