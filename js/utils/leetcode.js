/**
 * Build LeetCode problem URL from display number and title.
 */
(function (global) {
  global.leetCodeProblemUrl = function (num, name) {
    var slug = String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return 'https://leetcode.com/problems/' + slug + '/';
  };
})(window);
