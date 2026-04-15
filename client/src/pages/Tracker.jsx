import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import SheetTab from '../components/tabs/SheetTab';
import PracticeTab from '../components/tabs/PracticeTab';
import StreakTab from '../components/tabs/StreakTab';
import { DATA } from '../data/problems';
import { dsaTodayStr } from '../utils/streak';

function key(sid, pi) {
  return `${sid}_${pi}`;
}
function pk(day, pi) {
  return `p${day}_${pi}`;
}

const totalProblems = () => DATA.reduce((a, s) => a + s.p.length, 0);

export default function Tracker() {
  const { user, progress, token } = useAuth();
  const [tab, setTab] = useState('sheet');

  const [sheetDone, setSheetDone] = useState([]);
  const [practiceDone, setPracticeDone] = useState([]);
  const [streak, setStreak] = useState({ checkins: [] });
  const [openSections, setOpenSections] = useState([1, 2, 3]);
  const [openDays, setOpenDays] = useState([1]);

  const seeded = useRef(false);

  useEffect(() => {
    if (!user) {
      seeded.current = false;
      return;
    }
    if (progress == null) return;
    if (seeded.current) return;
    seeded.current = true;
    setSheetDone(progress.sheetDone || []);
    setPracticeDone(progress.practiceDone || []);
    setStreak(progress.streak && Array.isArray(progress.streak.checkins) ? { checkins: [...progress.streak.checkins] } : { checkins: [] });
    setOpenSections(progress.openSections?.length ? [...progress.openSections] : [1, 2, 3]);
  }, [user, progress]);

  useEffect(() => {
    if (!seeded.current || !token || !user) return;
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

  const toggleSheet = useCallback((sid, pi) => {
    const k = key(sid, pi);
    setSheetDone((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return [...next];
    });
  }, []);

  const toggleSec = useCallback((id) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id).sort((a, b) => a - b) : [...prev, id].sort((a, b) => a - b)
    );
  }, []);

  const togglePrac = useCallback((day, pi) => {
    const k = pk(day, pi);
    setPracticeDone((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return [...next];
    });
  }, []);

  const toggleDay = useCallback((day) => {
    setOpenDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }, []);

  const doCheckin = useCallback(() => {
    const today = dsaTodayStr();
    setStreak((prev) => {
      const list = [...(prev.checkins || [])];
      if (list.includes(today)) return prev;
      list.push(today);
      list.sort();
      return { checkins: list };
    });
  }, []);

  const note = `${totalProblems()} problems · 25 topics`;

  return (
    <>
      <Header note={note} />
      <div className="tab-nav">
        <button type="button" className={`tab-btn${tab === 'sheet' ? ' active' : ''}`} onClick={() => setTab('sheet')}>
          Sheet
        </button>
        <button
          type="button"
          className={`tab-btn practice-tab${tab === 'practice' ? ' active' : ''}`}
          onClick={() => setTab('practice')}
        >
          Practice
        </button>
        <button type="button" className={`tab-btn streak-tab${tab === 'streak' ? ' active' : ''}`} onClick={() => setTab('streak')}>
          🔥 Streak
        </button>
      </div>

      <div className={`tab-pane${tab === 'sheet' ? ' visible' : ''}`} id="tab-sheet">
        <SheetTab
          sheetDone={sheetDone}
          toggleSheet={toggleSheet}
          openSections={openSections}
          toggleSec={toggleSec}
        />
      </div>
      <div className={`tab-pane${tab === 'practice' ? ' visible' : ''}`} id="tab-practice">
        <PracticeTab
          practiceDone={practiceDone}
          togglePrac={togglePrac}
          openDays={openDays}
          toggleDay={toggleDay}
        />
      </div>
      <div className={`tab-pane${tab === 'streak' ? ' visible' : ''}`} id="tab-streak">
        <StreakTab streak={streak} doCheckin={doCheckin} />
      </div>

      <footer className="footer">
        Problems sourced from{' '}
        <a href="https://leetcode.com/problemset/" target="_blank" rel="noopener noreferrer">
          LeetCode
        </a>{' '}
        · Progress synced to your account
      </footer>
    </>
  );
}
