/**
 * Bootstraps UI after DOM + data scripts are loaded.
 */
(function () {
  function boot() {
    if (window.DSASheet && typeof window.DSASheet.init === 'function') {
      window.DSASheet.init();
    }
    if (typeof window.renderStreak === 'function') {
      window.renderStreak();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
