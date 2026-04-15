/**
 * Main sheet tab: topics, filters, progress, LeetCode links.
 */
(function () {
  var DATA = window.DATA;
  if (!DATA) return;

  var KEYS = window.DSA_KEYS;
  var done = window.DSAStorage.loadSet(KEYS.SHEET_PROGRESS);

  function save() {
    window.DSAStorage.saveSet(KEYS.SHEET_PROGRESS, done);
  }

  var filt = 'all';
  var openSec = new Set([1, 2, 3]);

  function k(sid, pi) {
    return sid + '_' + pi;
  }
  function total() {
    return DATA.reduce(function (a, s) {
      return a + s.p.length;
    }, 0);
  }
  function cntDiff(d) {
    return DATA.reduce(function (a, s) {
      return a + s.p.filter(function (p) {
        return p[2] === d;
      }).length;
    }, 0);
  }
  function dDiff(d) {
    var c = 0;
    DATA.forEach(function (s) {
      s.p.forEach(function (p, i) {
        if (p[2] === d && done.has(k(s.id, i))) c++;
      });
    });
    return c;
  }

  function updateStats() {
    var T = total(),
      N = done.size,
      P = T ? Math.round((N / T) * 100) : 0;
    var eT = cntDiff('Easy'),
      eD = dDiff('Easy');
    var mT = cntDiff('Medium'),
      mD = dDiff('Medium');
    var hT = cntDiff('Hard'),
      hD = dDiff('Hard');
    document.getElementById('pTxt').textContent = N + ' / ' + T + ' solved';
    document.getElementById('pPct').textContent = P + '%';
    document.getElementById('pFill').style.width = P + '%';
    document.getElementById('eBar').style.width = (eT ? Math.round((eD / eT) * 100) : 0) + '%';
    document.getElementById('mBar').style.width = (mT ? Math.round((mD / mT) * 100) : 0) + '%';
    document.getElementById('hBar').style.width = (hT ? Math.round((hD / hT) * 100) : 0) + '%';
    document.getElementById('eTxt').textContent = 'Easy ' + eD + '/' + eT;
    document.getElementById('mTxt').textContent = 'Medium ' + mD + '/' + mT;
    document.getElementById('hTxt').textContent = 'Hard ' + hD + '/' + hT;
    document.getElementById('totalNote').textContent = T + ' problems · 25 topics';
    document.getElementById('statsEl').innerHTML =
      st('Total', 'cv-total', N, 'of ' + T) +
      st('Easy', 'cv-easy', eD, 'of ' + eT) +
      st('Medium', 'cv-med', mD, 'of ' + mT) +
      st('Hard', 'cv-hard', hD, 'of ' + hT);
  }
  function st(l, c, v, s) {
    return (
      '<div class="st"><div class="st-lbl">' +
      l +
      '</div><div class="st-val ' +
      c +
      '">' +
      v +
      '</div><div class="st-sub">' +
      s +
      '</div></div>'
    );
  }

  function toggle(sid, pi) {
    var key = k(sid, pi);
    if (done.has(key)) done.delete(key);
    else done.add(key);
    save();
    updateStats();
    render();
  }
  function toggleSec(id) {
    if (openSec.has(id)) openSec.delete(id);
    else openSec.add(id);
    render();
  }
  function sf(v, el, cls) {
    filt = v;
    document.querySelectorAll('.pill').forEach(function (b) {
      b.className = 'pill';
    });
    el.classList.add(cls);
    render();
  }

  function render() {
    var q = (document.getElementById('srch').value || '').toLowerCase().trim();
    var html = '';
    var any = false;
    DATA.forEach(function (s, si) {
      var probs = s.p
        .map(function (p, i) {
          return { num: p[0], n: p[1], d: p[2], _i: i };
        })
        .filter(function (p) {
          if (q && !p.n.toLowerCase().includes(q) && !String(p.num).includes(q)) return false;
          var key = k(s.id, p._i);
          if (filt === 'done') return done.has(key);
          if (filt === 'todo') return !done.has(key);
          if (filt === 'Easy' || filt === 'Medium' || filt === 'Hard') return p.d === filt;
          return true;
        });
      if (!probs.length && q) return;
      any = true;
      var sD = s.p.filter(function (_, i) {
        return done.has(k(s.id, i));
      }).length;
      var sT = s.p.length;
      var sPct = sT ? Math.round((sD / sT) * 100) : 0;
      var isOpen = openSec.has(s.id);
      html +=
        '<div class="sec" style="animation-delay:' +
        Math.min(si * 0.02, 0.4) +
        's">' +
        '<div class="sec-hd" onclick="toggleSec(' +
        s.id +
        ')">' +
        '<div class="sec-num" style="background:' +
        s.bg +
        ';color:' +
        s.color +
        '">' +
        s.id +
        '</div>' +
        '<div class="sec-info">' +
        '<div class="sec-title">' +
        s.title +
        '</div>' +
        '<div class="sec-sub">' +
        sD +
        '/' +
        sT +
        ' solved</div>' +
        '</div>' +
        '<div class="sec-r">' +
        '<span class="sec-cnt">' +
        sD +
        '/' +
        sT +
        '</span>' +
        '<div class="sec-bar"><div class="sec-bar-f" style="background:' +
        s.color +
        ';width:' +
        sPct +
        '%"></div></div>' +
        '<span class="chev' +
        (isOpen ? ' op' : '') +
        '">&#9658;</span>' +
        '</div>' +
        '</div>';
      if (isOpen) {
        html += '<div class="plist">';
        if (!probs.length) {
          html += '<div class="empty">No problems match this filter.</div>';
        } else {
          probs.forEach(function (p) {
            var key = k(s.id, p._i);
            var isDone = done.has(key);
            var url = window.leetCodeProblemUrl(p.num, p.n);
            html +=
              '<div class="pr">' +
              '<div class="chk' +
              (isDone ? ' done' : '') +
              '" onclick="toggle(' +
              s.id +
              ',' +
              p._i +
              ')">' +
              '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '</div>' +
              '<span class="pn' +
              (isDone ? ' done' : '') +
              '"><span style="color:var(--text3);font-family:\'Space Mono\',monospace;font-size:10px;margin-right:6px">#' +
              p.num +
              '</span>' +
              p.n +
              '</span>' +
              '<span class="db ' +
              p.d +
              '">' +
              p.d +
              '</span>' +
              '<a class="lc-btn" href="' +
              url +
              '" target="_blank" rel="noopener">' +
              '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
              'Practice' +
              '</a>' +
              '</div>';
          });
        }
        html += '</div>';
      }
      html += '</div>';
    });
    if (!any)
      html =
        '<div class="empty" style="padding:3rem;text-align:center">No results. Try a different search.</div>';
    document.getElementById('secsEl').innerHTML = html;
  }

  window.toggle = toggle;
  window.toggleSec = toggleSec;
  window.sf = sf;
  window.render = render;
  window.updateSheetStats = updateStats;

  window.DSASheet = {
    init: function () {
      updateStats();
      render();
    }
  };
})();
