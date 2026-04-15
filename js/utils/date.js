/**
 * Date strings for streak / calendar (local timezone).
 */
(function (global) {
  global.dsaTodayStr = function () {
    var d = new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  };
})(window);
