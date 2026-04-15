import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import LoginModal from '../components/LoginModal';
import SheetTab from '../components/tabs/SheetTab';
import PracticeTab from '../components/tabs/PracticeTab';
import StreakTab from '../components/tabs/StreakTab';
import { DATA } from '../data/problems';
import { applyPendingToggle, clearGuestProgress, loadGuestProgress, mergeWithServerProgress, saveGuestProgress } from '../utils/guestProgress';
import { syncSheetDoneForPractice } from '../utils/practiceSheetSync';
import { appendTodayIfMissing, dsaTodayStr } from '../utils/streak';

function key(sid, pi) {
  return `${sid}_${pi}`;
}
function pk(day, pi) {
  return `p${day}_${pi}`;
}

const totalProblems = () => DATA.reduce((a, s) => a + s.p.length, 0);

export default function Tracker() {
  const [searchParams] = useSearchParams();
  const { user, progress, token, loading, login, setProgress } = useAuth();
  const [tab, setTab] = useState('sheet');
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginTitle, setLoginTitle] = useState('Sign in to continue');

  const [sheetDone, setSheetDone] = useState([]);
  const [practiceDone, setPracticeDone] = useState([]);
  const [streak, setStreak] = useState({ checkins: [] });
  const [openSections, setOpenSections] = useState([1, 2, 3]);
  const [openDays, setOpenDays] = useState([1]);

  const progressRef = useRef({ sheetDone, practiceDone, streak, openSections });
  const pendingRef = useRef(null);
  const prevTokenRef = useRef(token);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const fromUrl = searchParams.get('tab');
    if (fromUrl === 'sheet' || fromUrl === 'practice' || fromUrl === 'streak') {
      setTab(fromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    progressRef.current = { sheetDone, practiceDone, streak, openSections };
  }, [sheetDone, practiceDone, streak, openSections]);

  useEffect(() => {
    const prev = prevTokenRef.current;
    prevTokenRef.current = token;
    if (prev && !token) {
      saveGuestProgress(progressRef.current);
    }
  }, [token]);

  useEffect(() => {
    if (token) hydratedRef.current = false;
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (token) return;
    const g = loadGuestProgress();
    setSheetDone(g.sheetDone);
    setPracticeDone(g.practiceDone);
    setStreak(g.streak);
    setOpenSections(g.openSections?.length ? g.openSections : [1, 2, 3]);
    hydratedRef.current = true;
  }, [loading, token]);

  useEffect(() => {
    if (loading) return;
    if (!token || !user || progress == null) return;
    setSheetDone(progress.sheetDone || []);
    setPracticeDone(progress.practiceDone || []);
    setStreak(progress.streak && Array.isArray(progress.streak.checkins) ? { checkins: [...progress.streak.checkins] } : { checkins: [] });
    setOpenSections(progress.openSections?.length ? [...progress.openSections] : [1, 2, 3]);
    hydratedRef.current = true;
  }, [loading, token, user, progress]);

  /** Logged-in users: opening the app on a day records that day for streak (saved with progress). */
  useEffect(() => {
    if (loading || !token || !user || progress == null) return;
    const today = dsaTodayStr();
    setStreak((prev) => {
      if ((prev.checkins || []).includes(today)) return prev;
      return { checkins: appendTodayIfMissing(prev.checkins) };
    });
  }, [loading, token, user, progress]);

  useEffect(() => {
    if (!token) {
      const t = setTimeout(() => saveGuestProgress(progressRef.current), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [sheetDone, practiceDone, streak.checkins, openSections, token]);

  useEffect(() => {
    if (!hydratedRef.current || !token || !user) return;
    const t = setTimeout(() => {
      api
        .put('/progress', {
          sheetDone,
          practiceDone,
          streak: { checkins: streak.checkins || [] },
          openSections
        })
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [sheetDone, practiceDone, streak.checkins, openSections, token, user]);

  const _toggleSheet = useCallback((sid, pi) => {
    const k = key(sid, pi);
    setSheetDone((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return [...next];
    });
  }, []);

  const toggleSheet = useCallback(
    (sid, pi) => {
      if (!token) {
        pendingRef.current = { type: 'sheet', sid, pi };
        setLoginTitle('Sign in to mark problems');
        setLoginOpen(true);
        return;
      }
      _toggleSheet(sid, pi);
    },
    [token, _toggleSheet]
  );

  const _togglePrac = useCallback((day, pi) => {
    const k = pk(day, pi);
    setPracticeDone((prev) => {
      const next = new Set(prev);
      const wasDone = next.has(k);
      if (wasDone) next.delete(k);
      else next.add(k);
      return [...next];
    });
    setSheetDone((prev) => {
      const wasDone = practiceDone.includes(k);
      const nowDone = !wasDone;
      return syncSheetDoneForPractice(prev, day, pi, nowDone);
    });
  }, [practiceDone]);

  const togglePrac = useCallback(
    (day, pi) => {
      if (!token) {
        pendingRef.current = { type: 'practice', day, pi };
        setLoginTitle('Sign in to mark practice');
        setLoginOpen(true);
        return;
      }
      _togglePrac(day, pi);
    },
    [token, _togglePrac]
  );

  const toggleSec = useCallback((id) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id).sort((a, b) => a - b) : [...prev, id].sort((a, b) => a - b)
    );
  }, []);

  const toggleDay = useCallback((day) => {
    setOpenDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }, []);

  const doCheckin = useCallback(() => {
    if (!token) {
      pendingRef.current = { type: 'checkin' };
      setLoginTitle('Sign in to check in');
      setLoginOpen(true);
      return;
    }
    const today = dsaTodayStr();
    setStreak((prev) => {
      const list = [...(prev.checkins || [])];
      if (list.includes(today)) return prev;
      list.push(today);
      list.sort();
      return { checkins: list };
    });
  }, [token]);

  const handleModalLogin = useCallback(
    async (email, password) => {
      await login(email, password);
      const snap = progressRef.current;
      const pending = pendingRef.current;
      pendingRef.current = null;
      const { data: me } = await api.get('/auth/me');
      let merged = mergeWithServerProgress(snap, me.progress || {});
      merged = applyPendingToggle(merged, pending);
      merged.streak = { checkins: appendTodayIfMissing(merged.streak?.checkins) };
      const { data: saved } = await api.put('/progress', {
        sheetDone: merged.sheetDone,
        practiceDone: merged.practiceDone,
        streak: { checkins: merged.streak.checkins || [] },
        openSections: merged.openSections
      });
      const next = saved.progress || merged;
      setProgress(next);
      setSheetDone(next.sheetDone || []);
      setPracticeDone(next.practiceDone || []);
      setStreak(next.streak && Array.isArray(next.streak.checkins) ? { checkins: [...next.streak.checkins] } : { checkins: [] });
      setOpenSections(next.openSections?.length ? [...next.openSections] : [1, 2, 3]);
      hydratedRef.current = true;
      clearGuestProgress();
      setLoginOpen(false);
    },
    [login, setProgress]
  );

  const note = `${totalProblems()} problems · 25 topics`;

  if (loading && token) {
    return (
      <div className="auth-page">
        <p className="auth-sub">Loading your progress…</p>
      </div>
    );
  }

  return (
    <>
      <Header note={note} activeTab={tab} onTabChange={setTab} streak={streak} />

      <div className={`tab-pane${tab === 'sheet' ? ' visible' : ''}`} id="tab-sheet">
        <SheetTab sheetDone={sheetDone} toggleSheet={toggleSheet} openSections={openSections} toggleSec={toggleSec} />
      </div>
      <div className={`tab-pane${tab === 'practice' ? ' visible' : ''}`} id="tab-practice">
        <PracticeTab practiceDone={practiceDone} togglePrac={togglePrac} openDays={openDays} toggleDay={toggleDay} />
      </div>
      <div className={`tab-pane${tab === 'streak' ? ' visible' : ''}`} id="tab-streak">
        <StreakTab
          streak={streak}
          doCheckin={doCheckin}
          authenticated={!!token}
          sheetDone={sheetDone}
          displayName={user?.name || user?.email?.split('@')[0] || ''}
        />
      </div>

      <footer className="footer">
        Problems sourced from{' '}
        <a href="https://leetcode.com/problemset/" target="_blank" rel="noopener noreferrer">
          LeetCode
        </a>
        {token ? ' · Progress synced to your account' : ' · Mark a problem or check in on Streak to sign in'}
      </footer>

      <LoginModal
        open={loginOpen}
        title={loginTitle}
        onClose={() => {
          pendingRef.current = null;
          setLoginOpen(false);
        }}
        onSubmit={handleModalLogin}
      />
    </>
  );
}
