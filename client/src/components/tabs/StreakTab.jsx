import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/client';
import {
  buildLearningTimeChart,
  buildYearHeatmap,
  calcStreak,
  computeHeatmapLayout,
  dsaTodayStr,
  heatmapMonthTicks,
  heatmapNavMinYear,
  yearActivityStats
} from '../../utils/streak';
import { computeSheetStats } from '../../utils/sheetStats';

const DOW_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function stripHtml(value) {
  return (value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeEditorHtml(value) {
  return (value || '')
    .replace(/\sdir=(["'])rtl\1/gi, ' dir="ltr"')
    .replace(/\salign=(["'])right\1/gi, ' align="left"')
    .replace(/text-align\s*:\s*right/gi, 'text-align:left')
    .replace(/direction\s*:\s*rtl/gi, 'direction:ltr');
}

function NoteHtml({ html, className = '' }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html || '' }} />;
}

function NotesToolbarIcon({ children }) {
  return <span className="notes-toolbar-icon" aria-hidden="true">{children}</span>;
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="notes-toolbar-svg">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="notes-toolbar-svg">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconAlignLeft() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="notes-toolbar-svg">
      <path d="M4 6h14M4 10h10M4 14h14M4 18h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconAlignCenter() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="notes-toolbar-svg">
      <path d="M5 6h14M7 10h10M5 14h14M7 18h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconAlignRight() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="notes-toolbar-svg">
      <path d="M6 6h14M10 10h10M6 14h14M10 18h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconEditor() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="notes-toolbar-svg">
      <path d="M4 5h16v14H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 9h8M8 13h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m14 16 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="notes-toolbar-svg">
      <path d="M8 7h11M8 12h11M8 17h11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="5" cy="7" r="1.2" fill="currentColor" />
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="5" cy="17" r="1.2" fill="currentColor" />
    </svg>
  );
}

function PriorityOption({ value, current, onChange }) {
  return (
    <button
      type="button"
      className={`notes-priority-chip notes-priority-chip-${value.toLowerCase()}${current === value ? ' active' : ''}`}
      onClick={() => onChange(value)}
    >
      <i />
      {value}
    </button>
  );
}

function forceEditorLtr(editor) {
  if (!editor) return;
  editor.setAttribute('dir', 'ltr');
  editor.style.direction = 'ltr';
  editor.style.textAlign = 'left';
  editor.style.unicodeBidi = 'isolate';
  editor.style.writingMode = 'horizontal-tb';
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('justifyLeft');
}

function insertInlineCodePlaceholder(editor) {
  if (!editor) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    editor.focus();
  }
  const activeSelection = window.getSelection();
  if (!activeSelection || activeSelection.rangeCount === 0) return;

  const range = activeSelection.getRangeAt(0);
  const code = document.createElement('code');
  code.className = 'notes-inline-code';
  code.setAttribute('data-placeholder', 'code');

  if (!range.collapsed) {
    const contents = range.extractContents();
    code.appendChild(contents);
  }

  range.deleteContents();
  range.insertNode(code);

  const nextRange = document.createRange();
  nextRange.selectNodeContents(code);
  nextRange.collapse(false);
  activeSelection.removeAllRanges();
  activeSelection.addRange(nextRange);
}

/** Heatmap column stride (px); keep in sync with `.gh-cell` + gap in main.css */
const GH_CELL = 12;
const GH_GAP = 4;
function circLen(r) {
  return 2 * Math.PI * r;
}

function RingArc({ cx, cy, r, sw, fraction, trackClass, fgClass }) {
  const c = circLen(r);
  const d = Math.min(1, Math.max(0, fraction)) * c;
  return (
    <>
      <circle className={trackClass} cx={cx} cy={cy} r={r} fill="none" strokeWidth={sw} />
      <circle
        className={fgClass}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${d} ${c}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </>
  );
}

/** Three nested rings: outer Easy (teal), middle Medium (gold), inner Hard (red). */
function TripleRingProgress({ stats }) {
  const cx = 60;
  const cy = 60;
  const sw = 5.5;
  const easyFr = stats.easy.total > 0 ? stats.easy.done / stats.easy.total : 0;
  const medFr = stats.med.total > 0 ? stats.med.done / stats.med.total : 0;
  const hardFr = stats.hard.total > 0 ? stats.hard.done / stats.hard.total : 0;

  return (
    <div className="dsa-ring-wrap" aria-label="Progress by difficulty: Easy, Medium, Hard">
      <svg className="dsa-ring-svg" viewBox="0 0 120 120" aria-hidden="true">
        <RingArc cx={cx} cy={cy} r={52} sw={sw} fraction={easyFr} trackClass="dsa-ring-track" fgClass="dsa-ring-easy" />
        <RingArc cx={cx} cy={cy} r={40} sw={sw} fraction={medFr} trackClass="dsa-ring-track" fgClass="dsa-ring-med" />
        <RingArc cx={cx} cy={cy} r={28} sw={sw} fraction={hardFr} trackClass="dsa-ring-track" fgClass="dsa-ring-hard" />
      </svg>
      <div className="dsa-ring-label">
        <div className="dsa-ring-ratio">
          {stats.done}/{stats.total}
        </div>
        <div className="dsa-ring-subl">Solved</div>
      </div>
    </div>
  );
}

function TotalLearningTimeCard({ checkins }) {
  const [learnMode, setLearnMode] = useState('weekly');
  const [learnOffset, setLearnOffset] = useState(0);

  const chart = useMemo(() => buildLearningTimeChart(checkins, learnMode, learnOffset), [checkins, learnMode, learnOffset]);

  const yTicks = useMemo(() => {
    const m = chart.yMax;
    return [
      { label: `${m}m`, key: 'top' },
      { label: `${m / 2}m`, key: 'mid' },
      { label: '0', key: 'zero' }
    ];
  }, [chart.yMax]);

  const manyBars = chart.bars.length > 14;
  const chartHint =
    learnMode === 'all'
      ? `Estimated from streak check-ins (~${chart.sessionMinutes} min per active day). Totals are summed by year.`
      : `Estimated from streak check-ins (~${chart.sessionMinutes} min per active day). Add a timer later for exact minutes.`;

  const ariaChart =
    learnMode === 'weekly'
      ? 'Minutes studied per day this week'
      : learnMode === 'monthly'
        ? 'Minutes studied per day this month'
        : learnMode === 'yearly'
          ? 'Minutes studied per month this year'
          : 'Minutes studied per calendar year, all time';

  function onPeriodChange(e) {
    setLearnMode(e.target.value);
    setLearnOffset(0);
  }

  return (
    <div className="dash-card dash-learn-card">
      <div className="dash-learn-head">
        <h3 className="dash-card-title">Total Learning Time</h3>
        <label className="learn-period-label">
          <span className="learn-period-sr">Chart range</span>
          <select className="learn-period-select" value={learnMode} onChange={onPeriodChange}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="all">Till now</option>
          </select>
        </label>
      </div>
      <p className="learn-chart-hint">{chartHint}</p>
      <div className="learn-chart-row">
        <div className="learn-y-wrap" aria-hidden="true">
          <div className="learn-y-axis">
            {yTicks.map((t) => (
              <span key={t.key} className="learn-y-tick">
                {t.label}
              </span>
            ))}
          </div>
        </div>
        <div className={`learn-chart-main${manyBars ? ' learn-chart-main--scroll' : ''}`}>
          <div
            className={`learn-bars${manyBars ? ' learn-bars--many' : ''}`}
            style={manyBars ? { minWidth: chart.bars.length * 16 } : undefined}
            role="img"
            aria-label={ariaChart}
          >
            {chart.bars.map((bar) => {
              const h = chart.yMax ? (bar.minutes / chart.yMax) * 100 : 0;
              return (
                <div key={bar.key} className="learn-bar-col">
                  <div className="learn-bar-track">
                    <div
                      className={`learn-bar-fill${bar.minutes > 0 ? ' learn-bar-fill--on' : ''}`}
                      style={{ height: `${h}%` }}
                      title={bar.title}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className={`learn-dow-row${manyBars ? ' learn-dow-row--many' : ''}`}
            style={manyBars ? { minWidth: chart.bars.length * 16 } : undefined}
          >
            {chart.bars.map((bar) => (
              <span key={`lbl-${bar.key}`} className="learn-dow">
                {bar.xLabel}
              </span>
            ))}
          </div>
        </div>
      </div>
      {learnMode !== 'all' ? (
        <div className="learn-foot">
          <button
            type="button"
            className="learn-week-nav"
            aria-label="View older period"
            disabled={!chart.canGoOlder}
            onClick={() => setLearnOffset((x) => x + 1)}
          >
            ‹
          </button>
          <span className="learn-range">{chart.rangeLabel}</span>
          <button
            type="button"
            className="learn-week-nav"
            aria-label="View newer period"
            disabled={!chart.canGoNewer}
            onClick={() => setLearnOffset((x) => Math.max(0, x - 1))}
          >
            ›
          </button>
        </div>
      ) : (
        <div className="learn-foot learn-foot--static">
          <span className="learn-range">{chart.rangeLabel}</span>
        </div>
      )}
    </div>
  );
}

function buildMonthGrid(anchor) {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const first = new Date(y, m, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      day: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    });
  }
  return days;
}

function CalendarCard({ checkins }) {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const anchor = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const set = useMemo(() => new Set(checkins || []), [checkins]);
  const days = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const monthLabel = anchor.toLocaleString('default', { month: 'long', year: 'numeric' });
  const canGoNext = offset < 0;

  return (
    <div className="dash-card dash-calendar-card">
      <div className="cal-head">
        <h3 className="dash-card-title">{monthLabel}</h3>
        <div className="cal-nav">
          <button type="button" className="cal-nav-btn" onClick={() => setOffset((v) => v - 1)} aria-label="Previous month">
            ‹
          </button>
          <button type="button" className="cal-nav-btn" disabled={!canGoNext} onClick={() => setOffset((v) => Math.min(0, v + 1))} aria-label="Next month">
            ›
          </button>
        </div>
      </div>
      <div className="cal-grid-head">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="cal-grid">
        {days.map((d) => {
          const inMonth = d.month === anchor.getMonth() && d.year === anchor.getFullYear();
          const checked = set.has(d.key);
          return (
            <div key={d.key} className={`cal-cell${inMonth ? '' : ' out'}${checked ? ' hit' : ''}`}>
              <span>{d.day}</span>
              {checked ? <i aria-hidden="true">⚡</i> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StreakTab({ streak, doCheckin, authenticated = true, sheetDone = [], displayName = '' }) {
  const modalTitleRef = useRef(null);
  const modalBodyRef = useRef(null);
  const boardTitleRef = useRef(null);
  const boardBodyRef = useRef(null);

  const checkins = streak.checkins || [];
  const s = calcStreak(checkins);
  const submissionHistory = useMemo(
    () =>
      [...checkins]
        .sort((a, b) => (a < b ? 1 : -1))
        .map((dateStr, index) => ({
          id: `${dateStr}-${index}`,
          dateStr,
          label: new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            weekday: 'short'
          })
        })),
    [checkins]
  );
  const today = dsaTodayStr();
  const alreadyIn = checkins.includes(today);
  const stats = useMemo(() => computeSheetStats(sheetDone), [sheetDone]);

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonth = checkins.filter((c) => c.startsWith(ym)).length;

  const currentYear = now.getFullYear();
  const [heatYear, setHeatYear] = useState(currentYear);
  const heatmapMinYear = useMemo(() => heatmapNavMinYear(checkins, currentYear, 20), [checkins, currentYear]);
  const yStats = useMemo(() => yearActivityStats(checkins, heatYear), [checkins, heatYear]);
  const weeks = useMemo(() => buildYearHeatmap(checkins, heatYear), [checkins, heatYear]);
  const monthTicks = useMemo(() => heatmapMonthTicks(weeks, heatYear), [weeks, heatYear]);
  const heatLayout = useMemo(() => computeHeatmapLayout(weeks, GH_CELL, GH_GAP), [weeks]);
  const heatInnerPx = heatLayout.innerWidth;

  const firstName = displayName
    ? displayName.includes('@')
      ? displayName.split('@')[0]
      : displayName.split(/\s+/)[0]
    : '';

  const barPct = (d, t) => (t ? Math.round((d / t) * 100) : 0);

  const notesStorageKey = `dsa-streak-notes:${displayName || 'guest'}`;
  const [notes, setNotes] = useState(() => {
    try {
      const raw = localStorage.getItem(notesStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteLang, setNoteLang] = useState('JavaScript');
  const [notePriority, setNotePriority] = useState('Low');
  const [notesBoardOpen, setNotesBoardOpen] = useState(false);
  const [notesSearch, setNotesSearch] = useState('');
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [notesLoaded, setNotesLoaded] = useState(!authenticated);
  const [mobileNotesEditorOpen, setMobileNotesEditorOpen] = useState(false);

  useEffect(() => {
    if (authenticated) return;
    try {
      localStorage.setItem(notesStorageKey, JSON.stringify(notes));
    } catch {
      /* ignore storage write issues */
    }
  }, [authenticated, notesStorageKey, notes]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      if (!authenticated) {
        try {
          const raw = localStorage.getItem(notesStorageKey);
          const parsed = raw ? JSON.parse(raw) : [];
          if (!cancelled) {
            setNotes(Array.isArray(parsed) ? parsed : []);
          }
        } catch {
          if (!cancelled) {
            setNotes([]);
          }
        }
        setNotesLoaded(true);
        return;
      }
      try {
        const { data } = await api.get('/auth/notes');
        if (!cancelled) {
          setNotes(Array.isArray(data.notes) ? data.notes : []);
          setNotesLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setNotes([]);
          setNotesLoaded(true);
        }
      }
    }

    setNotesLoaded(!authenticated ? true : false);
    loadNotes();
    return () => {
      cancelled = true;
    };
  }, [authenticated, notesStorageKey]);

  useEffect(() => {
    if (!authenticated || !notesLoaded) return;
    const timeout = setTimeout(() => {
      api.put('/auth/notes', { notes }).catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [authenticated, notesLoaded, notes]);

  function openNotesPopup() {
    setNoteTitle('');
    setNoteBody('');
    setNoteLang('JavaScript');
    setNotePriority('Low');
    setNotesOpen(true);
  }

  function closeNotesPopup() {
    setNotesOpen(false);
  }

  function saveNote() {
    const title = noteTitle.trim();
    const body = noteBody.trim();
    if (!title && !body) return;
    const createdAt = new Date().toISOString();
    const prettyTime = new Date(createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    const nextNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title || 'Untitled',
      body,
      lang: noteLang,
      priority: notePriority,
      createdAt,
      prettyTime
    };
    setNotes((prev) => [
      nextNote,
      ...prev
    ]);
    setActiveNoteId(nextNote.id);
    setNotesOpen(false);
  }

  function openNotesBoard() {
    setNotesBoardOpen(true);
    setNotesSearch('');
    setMobileNotesEditorOpen(false);
    if (!activeNoteId && notes.length) {
      setActiveNoteId(notes[0].id);
    }
  }

  function closeNotesBoard() {
    setNotesBoardOpen(false);
    setMobileNotesEditorOpen(false);
  }

  function addNoteFromBoard() {
    const createdAt = new Date().toISOString();
    const prettyTime = new Date(createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    const nextNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: 'Untitled',
      body: '',
      lang: 'JavaScript',
      priority: 'Low',
      createdAt,
      prettyTime
    };
    setNotes((prev) => [nextNote, ...prev]);
    setActiveNoteId(nextNote.id);
    setMobileNotesEditorOpen(true);
  }

  function deleteActiveNote() {
    if (!activeNoteId) return;
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== activeNoteId);
      setActiveNoteId(next[0]?.id || null);
      return next;
    });
  }

  function updateActiveNote(patch) {
    if (!activeNoteId) return;
    setNotes((prev) => prev.map((n) => (n.id === activeNoteId ? { ...n, ...patch } : n)));
  }

  function applyModalFormat(kind) {
    const editor = modalBodyRef.current;
    if (!editor) return;
    editor.focus();
    forceEditorLtr(editor);
    if (kind === 'bold') document.execCommand('bold');
    else if (kind === 'italic') document.execCommand('italic');
    else if (kind === 'underline') document.execCommand('underline');
    else if (kind === 'bullet') document.execCommand('insertUnorderedList');
    else if (kind === 'number') document.execCommand('insertOrderedList');
    else if (kind === 'alignLeft') document.execCommand('justifyLeft');
    else if (kind === 'alignCenter') document.execCommand('justifyCenter');
    else if (kind === 'alignRight') document.execCommand('justifyRight');
    else if (kind === 'quote') document.execCommand('formatBlock', false, 'blockquote');
    else if (kind === 'code') insertInlineCodePlaceholder(editor);
    setNoteBody(normalizeEditorHtml(editor.innerHTML));
  }

  function applyBoardFormat(kind) {
    if (!activeNote) return;
    const editor = boardBodyRef.current;
    if (!editor) return;
    editor.focus();
    forceEditorLtr(editor);
    if (kind === 'bold') document.execCommand('bold');
    else if (kind === 'italic') document.execCommand('italic');
    else if (kind === 'underline') document.execCommand('underline');
    else if (kind === 'bullet') document.execCommand('insertUnorderedList');
    else if (kind === 'number') document.execCommand('insertOrderedList');
    else if (kind === 'alignLeft') document.execCommand('justifyLeft');
    else if (kind === 'alignCenter') document.execCommand('justifyCenter');
    else if (kind === 'alignRight') document.execCommand('justifyRight');
    else if (kind === 'quote') document.execCommand('formatBlock', false, 'blockquote');
    else if (kind === 'code') insertInlineCodePlaceholder(editor);
    updateActiveNote({ body: normalizeEditorHtml(editor.innerHTML) });
  }

  const filteredNotes = notes.filter((n) => {
    const q = notesSearch.trim().toLowerCase();
    if (!q) return true;
    return `${n.title} ${stripHtml(n.body)}`.toLowerCase().includes(q);
  });

  const activeNote = notes.find((n) => n.id === activeNoteId) || filteredNotes[0] || null;

  useEffect(() => {
    if (!notesBoardOpen) return;
    if (!activeNoteId && filteredNotes.length) {
      setActiveNoteId(filteredNotes[0].id);
    }
  }, [notesBoardOpen, filteredNotes, activeNoteId]);

  useEffect(() => {
    if (!notesOpen || !modalBodyRef.current) return;
    const editor = modalBodyRef.current;
    if (document.activeElement === editor) return;
    editor.innerHTML = normalizeEditorHtml(noteBody);
    forceEditorLtr(editor);
  }, [notesOpen]);

  useEffect(() => {
    if (!notesBoardOpen || !boardBodyRef.current) return;
    const editor = boardBodyRef.current;
    if (!activeNote) {
      editor.innerHTML = '';
      return;
    }
    if (document.activeElement === editor) return;
    editor.innerHTML = normalizeEditorHtml(activeNote.body);
    forceEditorLtr(editor);
  }, [notesBoardOpen, activeNoteId]);

  return (
    <div className="streak-dashboard streak-modern">
      <div className="dash-hero-row dash-hero-row-modern">
        <div className="dash-card dash-welcome-card dash-welcome-modern">
          <div className="dash-welcome-main">
            <p className="dash-kicker">Dashboard</p>
            <h2 className="dash-welcome-title">Hi, {firstName || 'Coder'}...!!</h2>
            <p className="dash-welcome-sub">
              {authenticated
                ? 'Discover courses, track progress, and achieve your learning goals seamlessly.'
                : 'Keep your streak and sheet progress in one place. Sign in to sync and auto-record daily visits.'}
            </p>
            <div className="dash-welcome-stats">
              <div className="dash-welcome-stat">
                <span className="dash-welcome-stat-val">{s.current}</span>
                <span className="dash-welcome-stat-lbl">Current streak</span>
              </div>
              <div className="dash-welcome-stat">
                <span className="dash-welcome-stat-val">{s.best}</span>
                <span className="dash-welcome-stat-lbl">Best streak</span>
              </div>
              <div className="dash-welcome-stat">
                <span className="dash-welcome-stat-val">{thisMonth}</span>
                <span className="dash-welcome-stat-lbl">This month</span>
              </div>
            </div>
            {(!authenticated || !alreadyIn) && (
              <div className="dash-welcome-actions">
                <button type="button" className={`btn-checkin${!authenticated ? ' btn-checkin-guest' : ''}`} onClick={doCheckin}>
                  {!authenticated ? 'Sign in to sync streak' : 'Check in today'}
                </button>
              </div>
            )}
          </div>
          <div className="visual-art-wrap" aria-hidden="true">
            <div className="visual-art">
              <div className="visual-orb" />
              <div className="visual-note" />
              <div className="visual-gear">⚙</div>
              <div className="visual-person">👨‍💻</div>
            </div>
          </div>
        </div>
        <CalendarCard checkins={checkins} />
      </div>

      <div className="dash-second-row">
        <div className="dash-second-left">
          <TotalLearningTimeCard checkins={checkins} />
          <div className="dash-card dash-dsa-card">
            <h3 className="dash-card-title">DSA Sheet Progress</h3>
            <div className="dsa-dash-body">
              <TripleRingProgress stats={stats} />
              <div className="dsa-bars-col">
                <div className="dsa-bar-row">
                  <span className="dsa-bar-lbl">Easy</span>
                  <div className="dsa-bar-track">
                    <div className="dsa-bar-fill dsa-bar-easy" style={{ width: `${barPct(stats.easy.done, stats.easy.total)}%` }} />
                  </div>
                  <span className="dsa-bar-meta">
                    {stats.easy.done}/{stats.easy.total}
                  </span>
                </div>
                <div className="dsa-bar-row">
                  <span className="dsa-bar-lbl">Medium</span>
                  <div className="dsa-bar-track">
                    <div className="dsa-bar-fill dsa-bar-med" style={{ width: `${barPct(stats.med.done, stats.med.total)}%` }} />
                  </div>
                  <span className="dsa-bar-meta">
                    {stats.med.done}/{stats.med.total}
                  </span>
                </div>
                <div className="dsa-bar-row">
                  <span className="dsa-bar-lbl">Hard</span>
                  <div className="dsa-bar-track">
                    <div className="dsa-bar-fill dsa-bar-hard" style={{ width: `${barPct(stats.hard.done, stats.hard.total)}%` }} />
                  </div>
                  <span className="dsa-bar-meta">
                    {stats.hard.done}/{stats.hard.total}
                  </span>
                </div>
              </div>
            </div>
            <div className="dsa-legend">
              <span>
                <i className="dsa-dot dsa-dot-easy" /> Easy
              </span>
              <span>
                <i className="dsa-dot dsa-dot-med" /> Medium
              </span>
              <span>
                <i className="dsa-dot dsa-dot-hard" /> Hard
              </span>
            </div>
          </div>
        </div>

        <div className="dash-card dash-notes-card dash-notes-card-side">
          <div className="notes-head">
            <h3 className="dash-card-title notes-title">My Notes</h3>
            <button type="button" className="notes-add-btn" aria-label="Add note" onClick={openNotesPopup}>
              +
            </button>
          </div>
          {!notes.length ? (
            <div className="notes-empty">
              <div className="notes-empty-icon" aria-hidden="true">
                🗒
              </div>
              <div className="notes-empty-title">Add Notes</div>
              <div className="notes-empty-sub">It seems there are no notes added yet.</div>
            </div>
          ) : (
            <div className="notes-list">
              {notes.slice(0, 2).map((n) => (
                <article key={n.id} className="note-item">
                  <div className="note-item-top">
                    <strong>{n.title}</strong>
                    <span className={`note-priority note-priority-${n.priority.toLowerCase()}`}>{n.priority}</span>
                  </div>
                  {n.body ? <NoteHtml className="note-preview-html" html={n.body} /> : null}
                  <div className="note-meta">
                    <span>{n.lang}</span>
                    <span>{n.prettyTime}</span>
                  </div>
                </article>
              ))}
              {notes.length > 2 ? (
                <button type="button" className="notes-see-all-btn" onClick={openNotesBoard}>
                  See All
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="gh-card dash-submission-card">
        <div className="gh-head">
          <div>
            <h3 className="gh-title">Submission</h3>
            <p className="gh-sub gh-sub-accent">
              {heatYear === currentYear
                ? `${yStats.activeDays} active day${yStats.activeDays === 1 ? '' : 's'} this year (one square = one day)`
                : `${yStats.activeDays} active day${yStats.activeDays === 1 ? '' : 's'} in ${heatYear}`}
            </p>
          </div>
          <div className="gh-meta">
            <div>
              Total active days: <strong>{s.total}</strong>
            </div>
            <div>
              Max streak: <strong>{yStats.maxStreak}</strong>
            </div>
            <div className="gh-year-nav">
              <button
                type="button"
                className="gh-year-btn"
                aria-label="Previous year"
                disabled={heatYear <= heatmapMinYear}
                onClick={() => setHeatYear((y) => y - 1)}
              >
                ‹
              </button>
              <span className="gh-year-label">{heatYear}</span>
              <button
                type="button"
                className="gh-year-btn"
                aria-label="Next year"
                disabled={heatYear >= currentYear}
                onClick={() => setHeatYear((y) => y + 1)}
              >
                ›
              </button>
            </div>
          </div>
        </div>
        <div className="gh-body">
          <div className="gh-dow-col" aria-hidden="true">
            {DOW_SHORT.map((label, i) => (
              <div key={i} className="gh-dow-label">
                {label}
              </div>
            ))}
          </div>
          <div className="gh-scroll">
            <div className="gh-inner" style={{ minWidth: heatInnerPx }}>
              <div className="gh-month-strip">
                {monthTicks.map((t) => (
                  <span key={`${t.wi}-${t.label}`} className="gh-month-tick" style={{ left: heatLayout.colStarts[t.wi] ?? 0 }}>
                    {t.label}
                  </span>
                ))}
              </div>
              <div className="gh-weeks">
                {weeks.map((col, wi) => (
                  <div key={wi} className="gh-col">
                    {col.map((cell, ri) => (
                      <div
                        key={`${cell.ds}-${ri}`}
                        className={`gh-cell${cell.inYear ? '' : ' out'}${cell.done ? ' on' : ''}`}
                        title={cell.inYear ? `${cell.ds}${cell.done ? ' · Checked in' : ' · No check-in'}` : undefined}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="gh-legend" aria-hidden="true">
          <span className="gh-legend-less">Less</span>
          <span className="gh-legend-cells">
            <i className="gh-legend-sample" />
            <i className="gh-legend-sample gh-legend-sample--mid" />
            <i className="gh-legend-sample gh-legend-sample--on" />
          </span>
          <span>More</span>
        </div>
      </div>

      <div className="dash-card dash-courses-card dash-courses-card-full">
        <h3 className="dash-card-title">My Courses</h3>
        <div className="courses-table-wrap">
          <table className="courses-table">
            <thead>
              <tr>
                <th>Course name</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="courses-name-cell">
                    <span className="courses-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </span>
                    <div>
                      <div className="courses-title">DSA Sheet</div>
                      <div className="courses-caption">
                        Questions completed | {stats.done}/{stats.total}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="courses-progress-cell">
                    <div className="courses-bar-track">
                      <div className="courses-bar-fill" style={{ width: `${stats.pctRaw}%` }} />
                    </div>
                    <span className="courses-pct">{stats.pctLabel}%</span>
                  </div>
                </td>
                <td>
                  <span className="courses-status">{stats.total > 0 && stats.done >= stats.total ? 'Complete' : 'In progress'}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="streak-log">
        <h3 className="streak-log-title">All Submission History</h3>
        {submissionHistory.length ? (
          <div className="log-list-inner">
            {submissionHistory.map((entry, idx) => (
              <div key={entry.id} className="log-row">
                <span className="log-date">{entry.label}</span>
                <span className="log-badge">{idx === 0 && entry.dateStr === today ? 'Today' : 'Submitted'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="log-empty">No submissions yet. Start by checking in today.</div>
        )}
      </div>

      {notesOpen ? (
        <div className="notes-modal-root" role="dialog" aria-modal="true" aria-label="Create note">
          <button type="button" className="notes-modal-backdrop" aria-label="Close notes popup" onClick={closeNotesPopup} />
          <div className="notes-modal-panel">
            <div className="notes-toolbar">
              <div className="notes-toolbar-left">
                <button type="button" className="notes-board-action" aria-label="Bold" title="Bold" onClick={() => applyModalFormat('bold')}>B</button>
                <button type="button" className="notes-board-action" aria-label="Italic" title="Italic" onClick={() => applyModalFormat('italic')}>I</button>
                <button type="button" className="notes-board-action" aria-label="Underline" title="Underline" onClick={() => applyModalFormat('underline')}>U</button>
                <button type="button" className="notes-board-action" aria-label="Bulleted list" title="Bulleted list" onClick={() => applyModalFormat('bullet')}>UL</button>
                <button type="button" className="notes-board-action" aria-label="Numbered list" title="Numbered list" onClick={() => applyModalFormat('number')}>OL</button>
                <button type="button" className="notes-board-action" aria-label="Align left" title="Align left" onClick={() => applyModalFormat('alignLeft')}>L</button>
                <button type="button" className="notes-board-action" aria-label="Align center" title="Align center" onClick={() => applyModalFormat('alignCenter')}>C</button>
                <button type="button" className="notes-board-action" aria-label="Align right" title="Align right" onClick={() => applyModalFormat('alignRight')}>R</button>
              </div>
              <label>
                <span className="learn-period-sr">Language</span>
                <select value={noteLang} onChange={(e) => setNoteLang(e.target.value)}>
                  <option>JavaScript</option>
                  <option>TypeScript</option>
                  <option>Python</option>
                  <option>CPP</option>
                  <option>Text</option>
                </select>
              </label>
              <label>
                <span className="learn-period-sr">Priority</span>
                <select value={notePriority} onChange={(e) => setNotePriority(e.target.value)}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
              <button type="button" className="notes-close-btn" aria-label="Close note editor" onClick={closeNotesPopup}>
                ×
              </button>
            </div>
            <input
              ref={modalTitleRef}
              type="text"
              className="notes-title-input"
              placeholder="Untitled"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
            <div
              ref={modalBodyRef}
              className={`notes-textarea notes-rich-editor${!stripHtml(noteBody) ? ' is-empty' : ''}`}
              contentEditable
              suppressContentEditableWarning
              dir="ltr"
              data-placeholder="Write your notes..."
              onFocus={(e) => forceEditorLtr(e.currentTarget)}
              onInput={(e) => {
                forceEditorLtr(e.currentTarget);
                setNoteBody(normalizeEditorHtml(e.currentTarget.innerHTML));
              }}
            />
            <div className="notes-modal-foot">
              <span>{new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              <button type="button" className="btn-checkin" onClick={saveNote}>
                Save Note
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notesBoardOpen ? (
        <div className="notes-board-root" role="dialog" aria-modal="true" aria-label="All notes">
          <button type="button" className="notes-modal-backdrop" aria-label="Close notes board" onClick={closeNotesBoard} />
          <div className={`notes-board-panel${mobileNotesEditorOpen ? ' notes-board-panel-mobile-editor' : ' notes-board-panel-mobile-list'}`}>
            <aside className={`notes-board-side${mobileNotesEditorOpen ? ' notes-board-side-mobile-hidden' : ''}`}>
              <div className="notes-board-title-row">
                <div className="notes-board-title">Notes</div>
                <button
                  type="button"
                  className="notes-mobile-switch-btn"
                  aria-label="Open editor"
                  title="Open editor"
                  onClick={() => setMobileNotesEditorOpen(true)}
                >
                  <IconEditor />
                </button>
              </div>
              <div className="notes-board-side-search">
                <div className="notes-board-search-wrap">
                  <span className="notes-board-search-icon" aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    className="notes-board-search"
                    placeholder="Search"
                    value={notesSearch}
                    onChange={(e) => setNotesSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="notes-board-list">
                {filteredNotes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`notes-board-item${activeNote?.id === n.id ? ' active' : ''}`}
                    onClick={() => {
                      setActiveNoteId(n.id);
                      setMobileNotesEditorOpen(true);
                    }}
                  >
                    <strong>{n.title || 'Untitled'}</strong>
                    <span>{n.prettyTime || 'Today'}</span>
                    <i className={`note-priority-dot ${n.priority?.toLowerCase() || 'low'}`} />
                  </button>
                ))}
                {!filteredNotes.length ? <div className="notes-board-empty">No notes found.</div> : null}
              </div>
            </aside>
            <section className={`notes-board-main${mobileNotesEditorOpen ? ' notes-board-main-mobile-active' : ''}`}>
              <div className="notes-board-toolbar">
                <div className="notes-board-toolbar-left">
                  <button
                    type="button"
                    className="notes-mobile-switch-btn"
                    aria-label="Back to notes list"
                    title="Back to notes list"
                    onClick={() => setMobileNotesEditorOpen(false)}
                  >
                    <IconList />
                  </button>
                  <div className="notes-board-toolbar-group">
                    <button type="button" className="notes-board-action" aria-label="Delete note" title="Delete note" onClick={deleteActiveNote}>
                      <IconTrash />
                    </button>
                    <button type="button" className="notes-board-action" aria-label="New note" title="New note" onClick={addNoteFromBoard}>
                      <NotesToolbarIcon>＋</NotesToolbarIcon>
                    </button>
                  </div>
                  <div className="notes-board-toolbar-group">
                    <button type="button" className="notes-board-action" aria-label="Bold" title="Bold" onClick={() => applyBoardFormat('bold')}><NotesToolbarIcon>B</NotesToolbarIcon></button>
                    <button type="button" className="notes-board-action" aria-label="Italic" title="Italic" onClick={() => applyBoardFormat('italic')}><NotesToolbarIcon>I</NotesToolbarIcon></button>
                    <button type="button" className="notes-board-action" aria-label="Underline" title="Underline" onClick={() => applyBoardFormat('underline')}><NotesToolbarIcon>U</NotesToolbarIcon></button>
                    <button type="button" className="notes-board-action" aria-label="Bulleted list" title="Bulleted list" onClick={() => applyBoardFormat('bullet')}><NotesToolbarIcon>•≡</NotesToolbarIcon></button>
                    <button type="button" className="notes-board-action" aria-label="Numbered list" title="Numbered list" onClick={() => applyBoardFormat('number')}><NotesToolbarIcon>1≡</NotesToolbarIcon></button>
                    <button type="button" className="notes-board-action" aria-label="Quote" title="Quote" onClick={() => applyBoardFormat('quote')}><NotesToolbarIcon>❝</NotesToolbarIcon></button>
                    <button type="button" className="notes-board-action" aria-label="Inline code" title="Inline code" onClick={() => applyBoardFormat('code')}><NotesToolbarIcon>{'<>'}</NotesToolbarIcon></button>
                  </div>
                  <div className="notes-board-toolbar-group">
                    <button type="button" className="notes-board-action" aria-label="Align left" title="Align left" onClick={() => applyBoardFormat('alignLeft')}><IconAlignLeft /></button>
                    <button type="button" className="notes-board-action" aria-label="Align center" title="Align center" onClick={() => applyBoardFormat('alignCenter')}><IconAlignCenter /></button>
                    <button type="button" className="notes-board-action" aria-label="Align right" title="Align right" onClick={() => applyBoardFormat('alignRight')}><IconAlignRight /></button>
                  </div>
                </div>
                <div className="notes-board-toolbar-right">
                  <label className="notes-lang-select">
                  <span className="learn-period-sr">Language</span>
                  <select value={activeNote?.lang || 'JavaScript'} onChange={(e) => updateActiveNote({ lang: e.target.value })}>
                    <option>JavaScript</option>
                    <option>TypeScript</option>
                    <option>Python</option>
                    <option>CPP</option>
                    <option>Text</option>
                  </select>
                  </label>
                  <button type="button" className="notes-close-btn" aria-label="Close notes board" onClick={closeNotesBoard}>
                    <IconClose />
                  </button>
                </div>
              </div>
              {activeNote ? (
                <>
                  <div className="notes-board-meta">
                    <span>{activeNote.prettyTime || 'Today'}</span>
                    <div className="notes-priority-group">
                      <span className="notes-priority-label">Priority:</span>
                      <PriorityOption value="Low" current={activeNote.priority} onChange={(value) => updateActiveNote({ priority: value })} />
                      <PriorityOption value="Medium" current={activeNote.priority} onChange={(value) => updateActiveNote({ priority: value })} />
                      <PriorityOption value="High" current={activeNote.priority} onChange={(value) => updateActiveNote({ priority: value })} />
                    </div>
                  </div>
                  <input
                    ref={boardTitleRef}
                    type="text"
                    className="notes-title-input notes-board-title-input"
                    dir="ltr"
                    value={activeNote.title}
                    onChange={(e) => updateActiveNote({ title: e.target.value })}
                  />
                  <div
                    ref={boardBodyRef}
                    className={`notes-textarea notes-board-textarea notes-rich-editor${!stripHtml(activeNote.body) ? ' is-empty' : ''}`}
                    contentEditable
                    suppressContentEditableWarning
                    dir="ltr"
                    data-placeholder="Write your notes..."
                    onFocus={(e) => forceEditorLtr(e.currentTarget)}
                    onInput={(e) => {
                      forceEditorLtr(e.currentTarget);
                      updateActiveNote({ body: normalizeEditorHtml(e.currentTarget.innerHTML) });
                    }}
                  />
                </>
              ) : (
                <div className="notes-board-empty-main">Create your first note using the + button.</div>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
