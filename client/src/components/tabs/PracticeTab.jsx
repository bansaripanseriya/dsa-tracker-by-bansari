import { useMemo, useState } from 'react';
import { PRACTICE_DAYS } from '../../data/practicePlan';
import { leetCodeProblemUrl } from '../../utils/leetcode';

function pk(day, pi) {
  return `p${day}_${pi}`;
}

function StarIcon({ filled = false }) {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {filled ? <path d="M15.9 4.4 19.3 11 26.5 12.1 21.2 17.1 22.5 24.3 15.9 20.9 9.3 24.3 10.6 17.1 5.3 12.1 12.5 11 15.9 4.4Z" fill="rgba(255, 205, 53, 0.18)" stroke="none" /> : null}
      <path strokeWidth="1.9" d="M16 4.2 19.4 10.9 26.7 12.1 21.3 17.3 22.6 24.5 16 21 9.4 24.5 10.7 17.3 5.3 12.1 12.6 10.9 16 4.2Z" />
      <path strokeWidth="1.5" d="M15.2 5.5 18.1 11.3 24.6 12.3 19.8 16.9 20.9 23.3 15.2 20.3 9.6 23.3 10.7 16.9 5.8 12.3 12.3 11.3 15.2 5.5Z" opacity="0.95" />
      <path strokeWidth="1.25" d="M16.8 6.4 18.9 11 24.2 11.8 20.3 15.6 21.3 21 16.8 18.6 12.3 21 13.2 15.6 9.4 11.8 14.6 11 16.8 6.4Z" opacity="0.85" />
      <path strokeWidth="1.15" d="M11.2 13.8 16.1 10.8 20.6 13.5" opacity="0.7" />
      <path strokeWidth="1.05" d="M12.4 17.1 16.1 14.8 19.8 16.9" opacity="0.72" />
      <path strokeWidth="1" d="M13.2 20.1 16.1 18.3 18.9 19.9" opacity="0.7" />
    </svg>
  );
}

export default function PracticeTab({ practiceDone, practiceSaved, togglePrac, togglePracSaved, openDays, toggleDay }) {
  const doneSet = useMemo(() => new Set(practiceDone), [practiceDone]);
  const savedSet = useMemo(() => new Set(practiceSaved), [practiceSaved]);
  const [filt, setFilt] = useState('all');
  const totalN = PRACTICE_DAYS.reduce((a, d) => a + d.problems.length, 0);
  const solved = practiceDone.length;
  const pct = totalN ? Math.round((solved / totalN) * 100) : 0;
  const filteredDays = PRACTICE_DAYS.map((d) => ({
    ...d,
    visibleProblems: d.problems
      .map((problem, index) => ({ problem, index }))
      .filter(({ index }) => {
        const currentKey = pk(d.day, index);
        if (filt === 'saved') return savedSet.has(currentKey);
        if (filt === 'done') return doneSet.has(currentKey);
        if (filt === 'todo') return !doneSet.has(currentKey);
        return true;
      })
  })).filter((d) => d.visibleProblems.length);

  return (
    <div className="prac-wrap">
      <div className="prac-hero">
        <h2>
          Daily <span>Practice Plan</span>
        </h2>
        <p>5 problems per day, curated by topic and difficulty. Complete each day to build consistent habits.</p>
      </div>
      <div className="prac-prog-wrap">
        <div className="prac-prog-top">
          <span>
            {solved} / {totalN} problems solved
          </span>
          <span>{pct}%</span>
        </div>
        <div className="prac-track">
          <div className="prac-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="ctrl">
        <button type="button" className={`pill${filt === 'all' ? ' on' : ''}`} onClick={() => setFilt('all')}>
          All
        </button>
        <button type="button" className={`pill${filt === 'saved' ? ' on' : ''}`} onClick={() => setFilt('saved')}>
          ★ Saved
        </button>
        <button type="button" className={`pill${filt === 'done' ? ' on' : ''}`} onClick={() => setFilt('done')}>
          ✓ Done
        </button>
        <button type="button" className={`pill${filt === 'todo' ? ' on' : ''}`} onClick={() => setFilt('todo')}>
          To Do
        </button>
      </div>
      <div className="day-grid">
        {!filteredDays.length ? (
          <div className="empty" style={{ padding: '3rem', textAlign: 'center' }}>
            No practice problems match this filter yet.
          </div>
        ) : (
        filteredDays.map((d) => {
          const dayDone = d.problems.filter((_, i) => doneSet.has(pk(d.day, i))).length;
          const allDone = dayDone === d.problems.length;
          const isOpen = openDays.includes(d.day);
          const dots = d.problems.map((_, i) => (
            <div key={i} className={`dot${doneSet.has(pk(d.day, i)) ? ' done' : ''}`} />
          ));
          return (
            <div key={d.day} className={`day-card${allDone ? ' all-done' : ''}`}>
              <button type="button" className="day-head" onClick={() => toggleDay(d.day)}>
                <div className={`day-badge${allDone ? ' done-badge' : ''}`}>{allDone ? '✓' : `D${d.day}`}</div>
                <div className="day-info">
                  <div className="day-title">
                    Day {d.day} — {d.topic}
                  </div>
                  <div className="day-subtitle">
                    {dayDone}/{d.problems.length} solved
                    {allDone ? ' · Complete!' : ''}
                  </div>
                </div>
                <div className="day-right">
                  <div className="day-dots">{dots}</div>
                  <span className={`day-chev${isOpen ? ' op' : ''}`}>&#9658;</span>
                </div>
              </button>
              {isOpen && (
                <div className="day-problems">
                  {d.visibleProblems.map(({ problem: p, index: originalIndex }) => {
                    const key = pk(d.day, originalIndex);
                    const isDone = doneSet.has(key);
                    const isSaved = savedSet.has(key);
                    const diffColor = p[2] === 'Easy' ? 'var(--easy)' : p[2] === 'Medium' ? 'var(--med)' : 'var(--hard)';
                    const diffBg =
                      p[2] === 'Easy' ? 'var(--easy-bg)' : p[2] === 'Medium' ? 'var(--med-bg)' : 'var(--hard-bg)';
                    const diffBd =
                      p[2] === 'Easy' ? 'var(--easy-bd)' : p[2] === 'Medium' ? 'var(--med-bd)' : 'var(--hard-bd)';
                    const url = leetCodeProblemUrl(p[0], p[1]);
                    return (
                      <div key={key} className="dp-row">
                        <button
                          type="button"
                          className={`chk${isDone ? ' done' : ''}`}
                          onClick={() => togglePrac(d.day, originalIndex)}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            border: '1.5px solid var(--border2)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ display: isDone ? 'block' : 'none' }}>
                            <path d="M2 6l3 3L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <div
                          className="dp-num-badge"
                          style={{
                            background: diffBg,
                            border: `1px solid ${diffBd}`,
                            color: diffColor
                          }}
                        >
                          {p[2][0]}
                        </div>
                        <span className={`dp-name${isDone ? ' done' : ''}`}>
                          {originalIndex + 1}. {p[1]}
                        </span>
                        <span className="lc-num">#{p[0]}</span>
                        <a className="lc-btn" href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', padding: '4px 10px' }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          Solve
                        </a>
                        <button
                          type="button"
                          className={`save-btn${isSaved ? ' saved' : ''}`}
                          onClick={() => togglePracSaved(d.day, originalIndex)}
                          aria-label={isSaved ? 'Remove from saved problems' : 'Save problem'}
                          title={isSaved ? 'Saved' : 'Save'}
                        >
                          <StarIcon filled={isSaved} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }))}
      </div>
    </div>
  );
}
