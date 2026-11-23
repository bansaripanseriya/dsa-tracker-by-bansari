import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import FriendAvatar from '../components/friends/FriendAvatar';
import { friendsApi } from '../api/friends';
import { useAuth } from '../context/AuthContext';
import { useLoader } from '../hooks/useLoader';
import {
  clearPendingInvite,
  copyText,
  displayName,
  errorMessage,
  firstName,
  formatTag,
  inviteLink,
  notifyFriendsChanged,
  setPendingInvite
} from '../utils/friends';

const PERKS = ['Race each other on the weekly leaderboard', "See each other's streaks and check-in heatmap", 'Compare progress on the sheet by difficulty'];

/**
 * /friends/add/:tag — what someone sees when they open an invite link.
 * Works signed out (name, avatar and tag only); the link only ever sends a request.
 */
export default function InviteLanding() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth();
  const signedIn = Boolean(token);

  // Wait for the session so the lookup is made with (or without) the token.
  const lookup = useLoader(() => (authLoading ? new Promise(() => {}) : friendsApi.byTag(tag)), [tag, authLoading, token]);
  const [relationship, setRelationship] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRelationship(lookup.data?.relationship ?? null);
  }, [lookup.data]);

  // Signed in on the invite page: the pending invite has done its job.
  useEffect(() => {
    if (signedIn) clearPendingInvite();
  }, [signedIn]);

  const person = lookup.data?.user;
  const name = person ? firstName(person) : '';
  const notFound = lookup.error?.response?.status === 404;

  function goAuth(path) {
    setPendingInvite(person?.tag || tag);
    navigate(path);
  }

  async function act(action) {
    setBusy(true);
    setActionError('');
    try {
      let res;
      if (action === 'send') res = await friendsApi.send(person.tag);
      else if (action === 'accept') res = await friendsApi.accept(person.tag);
      else res = await friendsApi.removeRequest(person.tag);
      setRelationship(res.relationship);
      notifyFriendsChanged();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyMine() {
    if (await copyText(inviteLink(person.tag))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  let content;
  if (authLoading || (lookup.loading && !lookup.data && !lookup.error)) {
    content = <p className="fr-muted fr-loading">Loading invite…</p>;
  } else if (lookup.error) {
    content = (
      <>
        <span className="fr-empty-icon" aria-hidden="true">
          🔗
        </span>
        <h1 className="fr-card-title">{notFound ? 'This invite link isn’t valid' : 'Could not open this invite'}</h1>
        <p className="fr-muted">
          {notFound ? `There's no one with the tag ${formatTag(tag.toUpperCase())}. Check the link with whoever sent it — tags look like #7K3QX9P.` : errorMessage(lookup.error)}
        </p>
        <div className="fr-invite-actions">
          <Link className="btn-checkin fr-btn" to={signedIn ? '/friends/find' : '/'}>
            {signedIn ? 'Find friends by name, #tag or email' : 'Go to DSA Tracker'}
          </Link>
        </div>
      </>
    );
  } else {
    const isSelf = relationship === 'self';
    const isFriend = relationship === 'friends';
    let headline = `${displayName(person)} invited you to be friends`;
    let eyebrow = 'Friend invite';
    let status = null;
    let actions;

    if (!signedIn) {
      actions = (
        <>
          <button type="button" className="btn-checkin fr-btn" onClick={() => goAuth('/login')}>
            Sign in to add {name}
          </button>
          <button type="button" className="pill fr-btn" onClick={() => goAuth('/register')}>
            Create an account
          </button>
        </>
      );
    } else if (isSelf) {
      eyebrow = 'Your invite link';
      headline = 'This is your own invite link';
      status = 'Share it — anyone who opens it can send you a friend request.';
      actions = (
        <>
          <button type="button" className="btn-checkin fr-btn" onClick={copyMine}>
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <Link className="pill fr-btn" to="/?tab=friends">
            Go to Friends
          </Link>
        </>
      );
    } else if (isFriend) {
      eyebrow = 'Friends';
      headline = `You and ${name} are friends`;
      status = "You're on each other's weekly leaderboard.";
      actions = (
        <>
          <Link className="btn-checkin fr-btn" to={`/friends/${person.tag}`}>
            View {name}'s profile
          </Link>
          <Link className="pill fr-btn" to="/?tab=friends">
            Go to Friends
          </Link>
        </>
      );
    } else if (relationship === 'outgoing') {
      status = `Request sent — waiting for ${name} to accept.`;
      actions = (
        <>
          <Link className="btn-checkin fr-btn" to="/?tab=friends">
            Go to Friends
          </Link>
          <button type="button" className="pill fr-btn" disabled={busy} onClick={() => act('cancel')}>
            Cancel request
          </button>
        </>
      );
    } else if (relationship === 'incoming') {
      eyebrow = 'Already waiting for you';
      headline = `${name} already sent you a request`;
      actions = (
        <>
          <button type="button" className="btn-checkin fr-btn" disabled={busy} onClick={() => act('accept')}>
            Accept — become friends
          </button>
          <Link className="pill fr-btn" to="/?tab=friends">
            Decide later
          </Link>
        </>
      );
    } else {
      actions = (
        <>
          <button type="button" className="btn-checkin fr-btn" disabled={busy} onClick={() => act('send')}>
            Send friend request
          </button>
          <Link className="pill fr-btn" to="/">
            Not now
          </Link>
        </>
      );
    }

    content = (
      <>
        <FriendAvatar person={person} size={88} />
        <span className="fr-subhead">{eyebrow}</span>
        <h1 className="fr-card-title fr-invite-title">{headline}</h1>
        <span className="fr-tag-pill">{formatTag(person.tag)}</span>
        {signedIn && !isSelf && typeof person.totalSolved === 'number' ? (
          <div className="st fr-invite-stat">
            <div className="st-val">{person.totalSolved}</div>
            <div className="st-sub">problems solved</div>
          </div>
        ) : null}
        {!isSelf && !isFriend && relationship !== 'outgoing' ? (
          <ul className="fr-perks">
            {PERKS.map((p) => (
              <li key={p}>
                <span aria-hidden="true">✓</span> {p}
              </li>
            ))}
          </ul>
        ) : null}
        {status ? (
          <p className="fr-status" role="status">
            {status}
          </p>
        ) : null}
        {actionError ? (
          <p className="fr-error" role="alert">
            {actionError}
          </p>
        ) : null}
        <div className="fr-invite-actions">{actions}</div>
        <p className="fr-muted fr-small">
          {!signedIn
            ? "We'll bring you right back here after you sign in. Anything you've ticked as a guest comes with you."
            : `${name}'s email and notes are never shown to you, and yours aren't shown to them.`}
        </p>
      </>
    );
  }

  return (
    <>
      <Header note="Friend invite" showNav />
      <div className="fr-page">
        <section className="dash-card fr-card fr-invite" aria-live="polite">
          {content}
        </section>
      </div>
    </>
  );
}
