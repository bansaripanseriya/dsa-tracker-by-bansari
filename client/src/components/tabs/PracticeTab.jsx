import { PRACTICE_DAYS } from '../../data/practicePlan';
import { leetCodeProblemUrl } from '../../utils/leetcode';

function pk(day, pi) {
  return `p${day}_${pi}`;
}

export default function PracticeTab({ practiceDone, togglePrac, openDays, toggleDay }) {
  const doneSet = new Set(practiceDone);
  const totalN = PRACTICE_DAYS.reduce((a, d) => a + d.problems.length, 0);
  const solved = practiceDone.length;
  const pct = totalN ? Math.round((solved / totalN) * 100) : 0;

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
      <div className="day-grid">
        {PRACTICE_DAYS.map((d) => {
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
                  {d.problems.map((p, i) => {
                    const key = pk(d.day, i);
                    const isDone = doneSet.has(key);
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
                          onClick={() => togglePrac(d.day, i)}
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
                          {i + 1}. {p[1]}
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
