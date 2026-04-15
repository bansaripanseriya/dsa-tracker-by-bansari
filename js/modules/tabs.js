/**
 * Tab navigation between Sheet, Practice, and Streak.
 */
function switchTab(name, btn) {
  document.querySelectorAll('.tab-pane').forEach(function (p) {
    p.classList.remove('visible');
  });
  document.querySelectorAll('.tab-btn').forEach(function (b) {
    b.classList.remove('active');
  });
  document.getElementById('tab-' + name).classList.add('visible');
  btn.classList.add('active');
  if (name === 'streak' && typeof window.renderStreak === 'function') window.renderStreak();
  if (name === 'practice' && typeof window.renderPractice === 'function') window.renderPractice();
}

window.switchTab = switchTab;
