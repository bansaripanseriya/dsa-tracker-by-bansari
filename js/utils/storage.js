/**
 * LocalStorage helpers (JSON + Set serialization).
 */
(function (global) {
  global.DSAStorage = {
    loadSet: function (key) {
      try {
        var s = localStorage.getItem(key);
        if (!s) return new Set();
        return new Set(JSON.parse(s));
      } catch (e) {
        return new Set();
      }
    },
    saveSet: function (key, set) {
      try {
        localStorage.setItem(key, JSON.stringify(Array.from(set)));
      } catch (e) {}
    },
    loadJSON: function (key, fallback) {
      try {
        var s = localStorage.getItem(key);
        if (!s) return fallback;
        return JSON.parse(s);
      } catch (e) {
        return fallback;
      }
    },
    saveJSON: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    }
  };
})(window);
