/**
 * Streak check-ins, calendar, and history.
 */
(function () {
  var KEYS = window.DSA_KEYS;
  var streakData = window.DSAStorage.loadJSON(KEYS.STREAK, { checkins: [] });
  if (!streakData.checkins) streakData.checkins = [];

  function saveStreak() {
    window.DSAStorage.saveJSON(KEYS.STREAK, streakData);
  }

  function doCheckin() {
    var today = window.dsaTodayStr();
    if (streakData.checkins.includes(today)) return;
    streakData.checkins.push(today);
    streakData.checkins.sort();
    saveStreak();
    renderStreak();
  }

  function calcStreak(checkins) {
    if (!checkins.length) return { current: 0, best: 0, total: checkins.length };
    var sorted = checkins.slice().sort();
    var best = 1;
    var temp = 1;
    for (var i = 1; i < sorted.length; i++) {
      var prev = new Date(sorted[i - 1]);
      var curr = new Date(sorted[i]);
      var diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        temp++;
        if (temp > best) best = temp;
      } else temp = 1;
    }
    var curStreak = 0;
    var d = new Date();
    while (true) {
      var ds =
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0');
      if (sorted.includes(ds)) {
        curStreak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return { current: curStreak, best: Math.max(best, curStreak), total: sorted.length };
  }

  function renderStreak() {
    var checkins = streakData.checkins || [];
    var s = calcStreak(checkins);
    var today = window.dsaTodayStr();
    var alreadyIn = checkins.includes(today);

    document.getElementById('streakCount').textContent = s.current;
    document.getElementById('streakBest').textContent = 'Best: ' + s.best + ' days';
    document.getElementById('sTotal').textContent = s.total;
    document.getElementById('sBest').textContent = s.best;

    var now = new Date();
    var ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var thisMonth = checkins.filter(function (c) {
      return c.startsWith(ym);
    }).length;
    document.getElementById('sThisMonth').textContent = thisMonth;

    var btn = document.getElementById('checkinBtn');
    if (alreadyIn) {
      btn.textContent = '✓ Checked in today!';
      btn.className = 'btn-checkin done';
      btn.disabled = true;
    } else {
      btn.textContent = 'Check in today';
      btn.className = 'btn-checkin';
      btn.disabled = false;
    }

    var yr = now.getFullYear(),
      mo = now.getMonth();
    document.getElementById('calMonthLabel').textContent = now.toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    });
    var firstDay = new Date(yr, mo, 1).getDay();
    var daysInMonth = new Date(yr, mo + 1, 0).getDate();
    var cal = '';
    for (var i = 0; i < firstDay; i++) cal += '<div class="cal-day empty"></div>';
    for (var day = 1; day <= daysInMonth; day++) {
      var ds =
        yr + '-' + String(mo + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var isDone = checkins.includes(ds);
      var isToday = ds === today;
      cal +=
        '<div class="cal-day' +
        (isDone ? ' done' : '') +
        (isToday ? ' today' : '') +
        '">' +
        day +
        '</div>';
    }
    document.getElementById('calGrid').innerHTML = cal;

    var recent = checkins.slice().sort().reverse().slice(0, 15);
    if (!recent.length) {
      document.getElementById('logList').innerHTML =
        '<div style="color:var(--text3);font-size:12px;text-align:center;padding:12px">No check-ins yet.</div>';
    } else {
      document.getElementById('logList').innerHTML = recent
        .map(function (c, i) {
          var date = new Date(c);
          var label = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          return (
            '<div class="log-row"><span class="log-date">' +
            label +
            '</span><span class="log-badge">' +
            (i === 0 && c === today ? 'Today' : 'Practiced') +
            '</span></div>'
          );
        })
        .join('');
    }
  }

  window.doCheckin = doCheckin;
  window.renderStreak = renderStreak;
})();
