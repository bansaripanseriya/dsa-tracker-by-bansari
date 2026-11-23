import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import FriendAvatar from '../components/friends/FriendAvatar';
import { friendsApi } from '../api/friends';
import { useAuth } from '../context/AuthContext';
import {
  copyText,
  displayName,
  errorMessage,
  formatTag,
  inviteLink,
  notifyFriendsChanged,
  searchModeOf
} from '../utils/friends';

const MODE_LABEL = { tag: 'Exact tag', email: 'Exact email', name: 'Name search' };
const MATCH_LABEL = { tag: 'Tag match', email: 'Email match', name: 'Name match', close: 'Close match' };
const REASON_HINT = {
  'invalid-tag': ['Tags are # followed by 7 characters', 'Like #7K3QX9P — letters and numbers, no 0, O, 1, I or L.'],
  'partial-email': ['Enter the full email address', 'Emails only match exactly, so partial emails are never searched.'],
  'too-short': ['Type at least 2 characters', 'Search by name, or paste a #tag or a full email address.']
};
const EMPTY_HINT = {
  tag: ['No one has that tag', 'Double-check it with your friend — tags never change.'],
  email: ['No account with that email', 'They may have signed up with a different email. Send them your invite link instead.'],
  name: ['No one found', 'Some people hide from name search. Try their #tag or full email.']
};

function ResultAction({ person, busy, onAct }) {
  switch (person.relationship) {
    case 'self':
      return <span className="fr-muted">That's you</span>;
    case 'friends':
      return (
        <Link className="pill fr-btn" to={`/friends/${person.tag}`}>
          Friends · View
        </Link>
      );
    case 'outgoing':
      return (
        <span className="fr-actions">
          <span className="fr-muted">Requested</span>
          <button type="button" className="pill fr-btn" disabled={busy} onClick={() => onAct('cancel')}>
            Cancel
          </button>
        </span>
      );
    case 'incoming':
      return (
        <span className="fr-actions">
          <span className="fr-muted">Wants to be friends</span>
          <button type="button" className="btn-checkin fr-btn" disabled={busy} onClick={() => onAct('accept')}>
            Accept
          </button>
        </span>
      );
    default:
      return (
        <button type="button" className="btn-checkin fr-btn" disabled={busy} onClick={() => onAct('add')}>
          + Add friend
        </button>
      );
  }
}

function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`fr-switch${checked ? ' on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export default function FindFriends() {
  const { user, discoverability, updateDiscoverability } = useAuth();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState({ status: 'idle', results: [], mode: 'name', reason: null });
  const [busyTag, setBusyTag] = useState(null);
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState('');
  const [savingSwitch, setSavingSwitch] = useState(false);
  const [switchError, setSwitchError] = useState('');

  // Debounced search; the server decides the mode the same way searchModeOf does.
  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setSearch({ status: 'idle', results: [], mode: 'name', reason: null });
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearch((s) => ({ ...s, status: 'loading' }));
      try {
        const data = await friendsApi.search(query);
        if (!cancelled) setSearch({ status: 'done', results: data.results, mode: data.mode, reason: data.reason || null });
      } catch (err) {
        if (!cancelled) setSearch({ status: 'error', results: [], mode: searchModeOf(query), reason: null, error: errorMessage(err, 'Search failed.') });
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  async function act(person, action) {
    setBusyTag(person.tag);
    setActionError('');
    try {
      let relationship = person.relationship;
      if (action === 'add') relationship = (await friendsApi.send(person.tag)).relationship;
      else if (action === 'accept') relationship = (await friendsApi.accept(person.tag)).relationship;
      else if (action === 'cancel') relationship = (await friendsApi.removeRequest(person.tag)).relationship;
      setSearch((s) => ({ ...s, results: s.results.map((r) => (r.tag === person.tag ? { ...r, relationship } : r)) }));
      notifyFriendsChanged();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyTag(null);
    }
  }

  async function copy(kind, text) {
    if (await copyText(text)) {
      setCopied(kind);
      setTimeout(() => setCopied(''), 2000);
    }
  }

  async function toggleNameSearch(next) {
    setSavingSwitch(true);
    setSwitchError('');
    try {
      await updateDiscoverability(next);
    } catch (err) {
      setSwitchError(errorMessage(err, 'Could not save that setting.'));
    } finally {
      setSavingSwitch(false);
    }
  }

  const tag = user?.friendTag;
  const typedMode = q.trim() ? searchModeOf(q) : null;
  const hint =
    search.status === 'done'
      ? search.reason
        ? REASON_HINT[search.reason]
        : !search.results.length
          ? EMPTY_HINT[search.mode]
          : null
      : null;
  const byName = discoverability?.byName !== false;

  return (
    <>
      <Header note="Find friends" showNav activeTab="friends" />
      <div className="fr-page">
        <Link className="fr-back" to="/?tab=friends">
          ‹ Back to Friends
        </Link>
        <div>
          <h1 className="fr-title">Add friends</h1>
          <p className="fr-muted">Search by name, friend tag or email — or send them your invite link.</p>
        </div>

        <div className="fr-layout">
          <section className="dash-card fr-card fr-main" aria-labelledby="fr-find-title">
            <h2 id="fr-find-title" className="fr-card-title">
              Find people
            </h2>
            <label className="fr-search-label" htmlFor="fr-q">
              Name, #tag or email
            </label>
            <div className="fr-search-box">
              <input
                id="fr-q"
                className="search"
                type="search"
                autoComplete="off"
                spellCheck="false"
                placeholder="Rohan, #7K3QX9P or friend@example.com"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {typedMode ? <span className="fr-mode-chip">{MODE_LABEL[typedMode]}</span> : null}
            </div>

            {search.status === 'loading' ? <p className="fr-muted">Searching…</p> : null}
            {search.status === 'error' ? (
              <p className="fr-error" role="alert">
                {search.error}
              </p>
            ) : null}
            {hint ? (
              <div className="fr-hint" role="status">
                <strong>{hint[0]}</strong>
                <span className="fr-muted">{hint[1]}</span>
              </div>
            ) : null}
            {actionError ? (
              <p className="fr-error" role="alert">
                {actionError}
              </p>
            ) : null}

            {search.results.length ? (
              <ul className="fr-list" aria-label="Search results">
                {search.results.map((p) => (
                  <li key={p.tag} className="fr-result">
                    <div className="fr-person">
                      <FriendAvatar person={p} size={42} />
                      <span className="fr-who">
                        <span className="fr-result-top">
                          <span className="fr-name">{displayName(p)}</span>
                          <span className="fr-match">{MATCH_LABEL[p.matchType]}</span>
                        </span>
                        <span className="fr-tag">
                          {formatTag(p.tag)} · {p.totalSolved} solved
                        </span>
                      </span>
                    </div>
                    <ResultAction person={p} busy={busyTag === p.tag} onAct={(action) => act(p, action)} />
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="fr-muted fr-small">
              Names match loosely; #tags and emails only match exactly. Email addresses are never shown in results.
            </p>
          </section>

          <aside className="fr-side">
            <section className="dash-card fr-card" aria-labelledby="fr-tag-title">
              <h2 id="fr-tag-title" className="fr-card-title">
                Your friend tag
              </h2>
              <div className="fr-tag-row">
                <span className="fr-tag-big">{tag ? formatTag(tag) : '…'}</span>
                <button type="button" className="pill fr-btn" disabled={!tag} onClick={() => copy('tag', formatTag(tag))}>
                  {copied === 'tag' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="fr-muted">Your tag never changes. Change your display name any time — friends and invite links keep working.</p>

              <div className="fr-who-finds" id="who-can-find-you">
                <span className="fr-subhead">Who can find you</span>
                <div className="fr-setting">
                  <span>
                    <strong>By tag</strong>
                    <span className="fr-muted">Always on — it's how invites work</span>
                  </span>
                  <Switch checked disabled label="Find me by tag" onChange={() => {}} />
                </div>
                <div className="fr-setting">
                  <span>
                    <strong>By exact email</strong>
                    <span className="fr-muted">Always on — someone must type your full address, and it's never shown</span>
                  </span>
                  <Switch checked disabled label="Find me by exact email" onChange={() => {}} />
                </div>
                <div className="fr-setting">
                  <span>
                    <strong>Show me in name search</strong>
                    <span className="fr-muted">{byName ? 'On — anyone signed in can find you by name' : 'Off — people need your tag or exact email'}</span>
                  </span>
                  <Switch checked={byName} disabled={savingSwitch} label="Show me in name search" onChange={toggleNameSearch} />
                </div>
                {switchError ? (
                  <p className="fr-error" role="alert">
                    {switchError}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="dash-card fr-card" aria-labelledby="fr-invite-title">
              <h2 id="fr-invite-title" className="fr-card-title">
                Invite link
              </h2>
              <p className="fr-muted">Anyone who opens this link while signed in can send you a request in one tap.</p>
              <div className="fr-tag-row">
                <span className="fr-link-box">{tag ? inviteLink(tag) : '…'}</span>
                <button type="button" className="pill fr-btn" disabled={!tag} onClick={() => copy('link', inviteLink(tag))}>
                  {copied === 'link' ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
