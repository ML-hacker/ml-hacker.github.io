/*
 * 内容页左上角的返回键。
 * 站内跳转进来的 -> history.back(), 回到你真正来的那一页;
 * 直接打开(搜索引擎 / 收藏 / 刷新) -> 用 href 里的文章列表兜底。
 */
(function () {
  "use strict";

  var link = document.querySelector("[data-page-back]");
  if (!link) {
    return;
  }

  link.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey || link.target === "_blank") {
      return;
    }

    var fromSameSite = false;
    try {
      fromSameSite = !!document.referrer &&
        new URL(document.referrer).origin === window.location.origin;
    } catch (e) {
      fromSameSite = false;
    }

    if (fromSameSite && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  });
})();
