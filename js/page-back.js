/*
 * 内容页左上角的返回键。
 * 站内跳转进来的 -> history.back(), 回到你真正来的那一页;
 * 直接打开(搜索引擎 / 收藏 / 刷新) -> 用 href 里的文章列表兜底。
 *
 * 注意: 主题的 <meta name="referrer" content="no-referrer"> 会让 document.referrer
 * 永远是空的, 所以这里不用 referrer, 改用 sessionStorage 记录"这个标签页来过本站没有"。
 */
(function () {
  "use strict";

  var KEY = "site-visited";

  function visited() {
    try { return sessionStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }

  function markVisited() {
    try { sessionStorage.setItem(KEY, "1"); } catch (e) { /* 隐私模式等忽略 */ }
  }

  var link = document.querySelector("[data-page-back]");

  // 这一页之前, 同一个标签页里有没有本站的其他页面
  var hasPreviousPage = visited();
  markVisited();

  if (!link) {
    return;
  }

  link.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey || link.target === "_blank") {
      return;
    }

    if (hasPreviousPage && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  });
})();
