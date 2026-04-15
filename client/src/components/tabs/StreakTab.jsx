import { calcStreak, dsaTodayStr } from '../../utils/streak';

export default function StreakTab({ streak, doCheckin }) {
  const checkins = streak.checkins || [];
  const s = calcStreak(checkins);
  const today = dsaTodayStr();
  const alreadyIn = checkins.includes(today);

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonth = checkins.filter((c) => c.startsWith(ym)).length;

  const yr = now.getFullYear();
  const mo = now.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const calCells = [];
  for (let i = 0; i < firstDay; i++) {
    calCells.push(<div key={`e-${i}`} className="cal-day empty" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isDone = checkins.includes(ds);
    const isToday = ds === today;
    calCells.push(
      <div key={ds} className={`cal-day${isDone ? ' done' : ''}${isToday ? ' today' : ''}`}>
        {d}
      </div>
    );
  }

  const recent = [...checkins].sort().reverse().slice(0, 15);

  return (
    <div className="streak-wrap">
      <div className="streak-hero">
        <div className="streak-fire">🔥</div>
        <div className="streak-count">{s.current}</div>
        <div className="streak-label">day streak</div>
        <div className="streak-best">Best: {s.best} days</div>
        <div className="streak-actions">
          <button type="button" className={`btn-checkin${alreadyIn ? ' done' : ''}`} onClick={doCheckin} disabled={alreadyIn}>
            {alreadyIn ? '✓ Checked in today!' : 'Check in today'}
          </button>
        </div>
      </div>

      <div className="streak-stats-grid">
        <div className="sstat">
          <div className="sstat-val">{s.total}</div>
          <div className="sstat-lbl">Total days</div>
        </div>
        <div className="sstat">
          <div className="sstat-val">{s.best}</div>
          <div className="sstat-lbl">Best streak</div>
        </div>
        <div className="sstat">
          <div className="sstat-val">{thisMonth}</div>
          <div className="sstat-lbl">This month</div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div className="streak-calendar-head">
          <span>{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          <span>Mark days you practiced</span>
        </div>
        <div className="cal-weekdays">
          <div className="cal-wd">Sun</div>
          <div className="cal-wd">Mon</div>
          <div className="cal-wd">Tue</div>
          <div className="cal-wd">Wed</div>
          <div className="cal-wd">Thu</div>
          <div className="cal-wd">Fri</div>
          <div className="cal-wd">Sat</div>
        </div>
        <div className="cal-grid">{calCells}</div>
      </div>

      <div className="streak-log">
        <div className="streak-log-title">Check-in history</div>
        <div id="logList">
          {!recent.length ? (
            <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 12 }}>No check-ins yet.</div>
          ) : (
            recent.map((c, i) => {
              const date = new Date(c);
              const label = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              return (
                <div key={c} className="log-row">
                  <span className="log-date">{label}</span>
                  <span className="log-badge">{i === 0 && c === today ? 'Today' : 'Practiced'}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
