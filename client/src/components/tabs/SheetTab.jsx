import { useMemo, useState } from 'react';
import { DATA } from '../../data/problems';
import { leetCodeProblemUrl } from '../../utils/leetcode';

function key(sid, pi) {
  return `${sid}_${pi}`;
}

function totalProblems() {
  return DATA.reduce((a, s) => a + s.p.length, 0);
}

function cntDiff(d) {
  return DATA.reduce((a, s) => a + s.p.filter((p) => p[2] === d).length, 0);
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

export default function SheetTab({ sheetDone, sheetSaved, toggleSheet, toggleSheetSaved, openSections, toggleSec }) {
  const doneSet = useMemo(() => new Set(sheetDone), [sheetDone]);
  const savedSet = useMemo(() => new Set(sheetSaved), [sheetSaved]);
  const [filt, setFilt] = useState('all');
  const [q, setQ] = useState('');

  function sf(v) {
    setFilt(v);
  }

  const stats = useMemo(() => {
    const T = totalProblems();
    const N = sheetDone.length;
    const P = T ? Math.round((N / T) * 100) : 0;
    const eT = cntDiff('Easy');
    const mT = cntDiff('Medium');
    const hT = cntDiff('Hard');
    const dDiff = (diff) => {
      let c = 0;
      DATA.forEach((s) => {
        s.p.forEach((p, i) => {
          if (p[2] === diff && doneSet.has(key(s.id, i))) c++;
        });
      });
      return c;
    };
    const eD = dDiff('Easy');
    const mD = dDiff('Medium');
    const hD = dDiff('Hard');
    return { T, N, P, eT, eD, mT, mD, hT, hD };
  }, [sheetDone]);

  const sectionsHtml = useMemo(() => {
    const query = q.toLowerCase().trim();
    let any = false;
    const out = [];

    DATA.forEach((s, si) => {
      const probs = s.p
        .map((p, i) => ({ num: p[0], n: p[1], d: p[2], _i: i }))
        .filter((p) => {
          if (query && !p.n.toLowerCase().includes(query) && !String(p.num).includes(query)) return false;
          const k = key(s.id, p._i);
          if (filt === 'done') return doneSet.has(k);
          if (filt === 'todo') return !doneSet.has(k);
          if (filt === 'saved') return savedSet.has(k);
          if (filt === 'Easy' || filt === 'Medium' || filt === 'Hard') return p.d === filt;
          return true;
        });
      if (!probs.length) return;
      any = true;

      const sD = s.p.filter((_, i) => doneSet.has(key(s.id, i))).length;
      const sT = s.p.length;
      const sPct = sT ? Math.round((sD / sT) * 100) : 0;
      const isOpen = openSections.includes(s.id);

      out.push(
        <div key={s.id} className="sec" style={{ animationDelay: `${Math.min(si * 0.02, 0.4)}s` }}>
          <button type="button" className="sec-hd" onClick={() => toggleSec(s.id)}>
            <div className="sec-num" style={{ background: s.bg, color: s.color }}>
              {s.id}
            </div>
            <div className="sec-info">
              <div className="sec-title">{s.title}</div>
              <div className="sec-sub">
                {sD}/{sT} solved
              </div>
            </div>
            <div className="sec-r">
              <span className="sec-cnt">
                {sD}/{sT}
              </span>
              <div className="sec-bar">
                <div className="sec-bar-f" style={{ background: s.color, width: `${sPct}%` }} />
              </div>
              <span className={`chev${isOpen ? ' op' : ''}`}>&#9658;</span>
            </div>
          </button>
          {isOpen && (
            <div className="plist">
              {!probs.length ? (
                <div className="empty">No problems match this filter.</div>
              ) : (
                probs.map((p) => {
                  const k = key(s.id, p._i);
                  const isDone = doneSet.has(k);
                  const isSaved = savedSet.has(k);
                  const url = leetCodeProblemUrl(p.num, p.n);
                  return (
                    <div key={k} className="pr">
                      <button
                        type="button"
                        className={`chk${isDone ? ' done' : ''}`}
                        onClick={() => toggleSheet(s.id, p._i)}
                        aria-label={isDone ? 'Mark not done' : 'Mark done'}
                      >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6l3 3L10 3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <span className={`pn${isDone ? ' done' : ''}`}>
                        <span
                          style={{
                            color: 'var(--text3)',
                            fontFamily: "'Space Mono',monospace",
                            fontSize: '12px',
                            marginRight: '6px'
                          }}
                        >
                          #{p.num}
                        </span>
                        {p.n}
                      </span>
                      <span className={`db ${p.d}`}>{p.d}</span>
                      <a className="lc-btn" href={url} target="_blank" rel="noopener noreferrer">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Practice
                      </a>
                      <button
                        type="button"
                        className={`save-btn${isSaved ? ' saved' : ''}`}
                        onClick={() => toggleSheetSaved(s.id, p._i)}
                        aria-label={isSaved ? 'Remove from saved problems' : 'Save problem'}
                        title={isSaved ? 'Saved' : 'Save'}
                      >
                        <StarIcon filled={isSaved} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      );
    });

    return { nodes: out, any };
  }, [q, filt, doneSet, savedSet, openSections, toggleSheet, toggleSheetSaved, toggleSec]);

  const st = stats;

  return (
    <>
      <section className="hero">
        <h1>
          All LeetCode problems, <span>topic by topic</span>
        </h1>
        <p>Every important free problem categorized across 25 topics. Click Practice to open directly on LeetCode.</p>
      </section>

      <div className="stats">
        <div className="st">
          <div className="st-lbl">Total</div>
          <div className="st-val cv-total">{st.N}</div>
          <div className="st-sub">of {st.T}</div>
        </div>
        <div className="st">
          <div className="st-lbl">Easy</div>
          <div className="st-val cv-easy">{st.eD}</div>
          <div className="st-sub">of {st.eT}</div>
        </div>
        <div className="st">
          <div className="st-lbl">Medium</div>
          <div className="st-val cv-med">{st.mD}</div>
          <div className="st-sub">of {st.mT}</div>
        </div>
        <div className="st">
          <div className="st-lbl">Hard</div>
          <div className="st-val cv-hard">{st.hD}</div>
          <div className="st-sub">of {st.hT}</div>
        </div>
      </div>

      <div className="prog">
        <div className="prog-row">
          <span>
            {st.N} / {st.T} solved
          </span>
          <span>{st.P}%</span>
        </div>
        <div className="prog-track">
          <div className="prog-fill" style={{ width: `${st.P}%` }} />
        </div>
        <div className="diff-row">
          <div className="dr">
            <div className="dr-track">
              <div className="dr-fill" style={{ background: 'var(--easy)', width: `${st.eT ? Math.round((st.eD / st.eT) * 100) : 0}%` }} />
            </div>
            <span style={{ color: 'var(--easy)' }}>
              Easy {st.eD}/{st.eT}
            </span>
          </div>
          <div className="dr">
            <div className="dr-track">
              <div className="dr-fill" style={{ background: 'var(--med)', width: `${st.mT ? Math.round((st.mD / st.mT) * 100) : 0}%` }} />
            </div>
            <span style={{ color: 'var(--med)' }}>
              Medium {st.mD}/{st.mT}
            </span>
          </div>
          <div className="dr">
            <div className="dr-track">
              <div className="dr-fill" style={{ background: 'var(--hard)', width: `${st.hT ? Math.round((st.hD / st.hT) * 100) : 0}%` }} />
            </div>
            <span style={{ color: 'var(--hard)' }}>
              Hard {st.hD}/{st.hT}
            </span>
          </div>
        </div>
      </div>

      <div className="ctrl">
        <div className="sw">
          <svg className="si" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input className="search" placeholder="Search any problem…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        </div>
        <button type="button" className={`pill${filt === 'all' ? ' on' : ''}`} onClick={() => sf('all')}>
          All
        </button>
        <button type="button" className={`pill${filt === 'Easy' ? ' eon' : ''}`} onClick={() => sf('Easy')}>
          Easy
        </button>
        <button type="button" className={`pill${filt === 'Medium' ? ' mon' : ''}`} onClick={() => sf('Medium')}>
          Medium
        </button>
        <button type="button" className={`pill${filt === 'Hard' ? ' hon' : ''}`} onClick={() => sf('Hard')}>
          Hard
        </button>
        <button type="button" className={`pill${filt === 'done' ? ' on' : ''}`} onClick={() => sf('done')}>
          ✓ Done
        </button>
        <button type="button" className={`pill${filt === 'saved' ? ' on' : ''}`} onClick={() => sf('saved')}>
          ★ Saved
        </button>
        <button type="button" className={`pill${filt === 'todo' ? ' on' : ''}`} onClick={() => sf('todo')}>
          To Do
        </button>
      </div>

      <div className="secs">
        {!sectionsHtml.any ? (
          <div className="empty" style={{ padding: '3rem', textAlign: 'center' }}>
            No results. Try a different search.
          </div>
        ) : (
          sectionsHtml.nodes
        )}
      </div>
    </>
  );
}
