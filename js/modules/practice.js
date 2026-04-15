/**
 * Daily practice plan tab.
 */
(function () {
  var PRACTICE_DAYS = window.PRACTICE_DAYS;
  if (!PRACTICE_DAYS) return;

  var KEYS = window.DSA_KEYS;
  var pracDone = window.DSAStorage.loadSet(KEYS.PRACTICE_PROGRESS);

  function savePrac() {
    window.DSAStorage.saveSet(KEYS.PRACTICE_PROGRESS, pracDone);
  }

  var openDays = new Set([1]);

  function pk(day, pi) {
    return 'p' + day + '_' + pi;
  }

  function togglePrac(day, pi) {
    var key = pk(day, pi);
    if (pracDone.has(key)) pracDone.delete(key);
    else pracDone.add(key);
    savePrac();
    renderPractice();
  }
  function toggleDay(day) {
    if (openDays.has(day)) openDays.delete(day);
    else openDays.add(day);
    renderPractice();
  }

  function renderPractice() {
    var totalN = PRACTICE_DAYS.reduce(function (a, d) {
      return a + d.problems.length;
    }, 0);
    var solved = pracDone.size;
    var pct = totalN ? Math.round((solved / totalN) * 100) : 0;
    document.getElementById('pracProgTxt').textContent = solved + ' / ' + totalN + ' problems solved';
    document.getElementById('pracProgPct').textContent = pct + '%';
    document.getElementById('pracFill').style.width = pct + '%';

    var html = '';
    PRACTICE_DAYS.forEach(function (d) {
      var dayDone = d.problems.filter(function (_, i) {
        return pracDone.has(pk(d.day, i));
      }).length;
      var allDone = dayDone === d.problems.length;
      var isOpen = openDays.has(d.day);
      var dots = d.problems
        .map(function (_, i) {
          return '<div class="dot' + (pracDone.has(pk(d.day, i)) ? ' done' : '') + '"></div>';
        })
        .join('');
      html +=
        '<div class="day-card' +
        (allDone ? ' all-done' : '') +
        '">' +
        '<div class="day-head" onclick="toggleDay(' +
        d.day +
        ')">' +
        '<div class="day-badge' +
        (allDone ? ' done-badge' : '') +
        '">' +
        (allDone ? '✓' : 'D' + d.day) +
        '</div>' +
        '<div class="day-info">' +
        '<div class="day-title">Day ' +
        d.day +
        ' — ' +
        d.topic +
        '</div>' +
        '<div class="day-subtitle">' +
        dayDone +
        '/' +
        d.problems.length +
        ' solved' +
        (allDone ? ' · Complete!' : '') +
        '</div>' +
        '</div>' +
        '<div class="day-right">' +
        '<div class="day-dots">' +
        dots +
        '</div>' +
        '<span class="day-chev' +
        (isOpen ? ' op' : '') +
        '">&#9658;</span>' +
        '</div>' +
        '</div>';
      if (isOpen) {
        html += '<div class="day-problems">';
        d.problems.forEach(function (p, i) {
          var key = pk(d.day, i);
          var isDone = pracDone.has(key);
          var diffColor =
            p[2] === 'Easy' ? 'var(--easy)' : p[2] === 'Medium' ? 'var(--med)' : 'var(--hard)';
          var diffBg =
            p[2] === 'Easy' ? 'var(--easy-bg)' : p[2] === 'Medium' ? 'var(--med-bg)' : 'var(--hard-bg)';
          var diffBd =
            p[2] === 'Easy' ? 'var(--easy-bd)' : p[2] === 'Medium' ? 'var(--med-bd)' : 'var(--hard-bd)';
          var url = window.leetCodeProblemUrl(p[0], p[1]);
          html +=
            '<div class="dp-row">' +
            '<div class="chk' +
            (isDone ? ' done' : '') +
            '" onclick="togglePrac(' +
            d.day +
            ',' +
            i +
            ')" style="width:18px;height:18px;border-radius:4px;border:1.5px solid var(--border2);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:transparent;transition:all .15s;' +
            (isDone ? 'background:var(--accent);border-color:var(--accent);' : '') +
            '">' +
            '<svg width="9" height="9" viewBox="0 0 10 10" fill="none" style="display:' +
            (isDone ? 'block' : 'none') +
            '"><path d="M2 5l2.5 2.5L8 3" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</div>' +
            '<div class="dp-num-badge" style="background:' +
            diffBg +
            ';border:1px solid ' +
            diffBd +
            ';color:' +
            diffColor +
            '">' +
            p[2][0] +
            '</div>' +
            '<span class="dp-name' +
            (isDone ? ' done' : '') +
            '">' +
            (i + 1) +
            '. ' +
            p[1] +
            '</span>' +
            '<span class="lc-num">#' +
            p[0] +
            '</span>' +
            '<a class="lc-btn" href="' +
            url +
            '" target="_blank" rel="noopener" style="font-size:10px;padding:3px 9px">' +
            '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
            'Solve' +
            '</a>' +
            '</div>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    document.getElementById('dayGrid').innerHTML = html;
  }

  window.togglePrac = togglePrac;
  window.toggleDay = toggleDay;
  window.renderPractice = renderPractice;
})();
