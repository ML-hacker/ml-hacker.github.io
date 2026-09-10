/*
 * 「点开文章时标题滑动过去」在 Firefox 等浏览器上的脚本实现。
 *
 * 原生做法 (Chrome 126+ / Safari 18.2+) 完全由 CSS 完成:
 *   @view-transition { navigation: auto }
 *   + 列表页标题和文章页标题用同一个 view-transition-name
 * Firefox 只是部分实现 (有 @view-transition 规则和 CSSViewTransitionRule,
 * 但跨文档转场不一定真的执行), 所以这里用 CSS 动画模拟:
 *   列表页标题先飞走 -> 导航 -> 文章页标题再滑进来
 *
 * 调试用:
 *   网址加 ?vt=fallback  强制走脚本动画
 *   网址加 ?vt=native    强制走浏览器原生转场
 */
(function () {
  "use strict";

  // 必须和 _custom.scss 里 title-transition-leave / -enter 的动画时长一致
  var DURATION = 420;
  var NATIVE_KEY = "vt-native";        // 上一次导航浏览器有没有自己做转场
  var FROM_LIST_KEY = "vt-from-list";  // 本次导航是不是从文章列表点进来的
  var FORCE_KEY = "vt-force";          // 调试开关, 跟随整个标签页

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  var force = null;
  try {
    force = new URLSearchParams(window.location.search).get("vt");
  } catch (e) {
    force = null;
  }

  function read(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }

  function write(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) { /* 隐私模式等忽略 */ }
  }

  function drop(key) {
    try { sessionStorage.removeItem(key); } catch (e) { /* 忽略 */ }
  }

  // ?vt=fallback / ?vt=native 只在第一次带参数时生效, 之后跟随整个标签页,
  // 这样点进文章以后还能继续用同一种模式对比。
  if (force === "native") {
    drop(FORCE_KEY);
  } else if (force === "fallback") {
    write(FORCE_KEY, "fallback");
  }
  force = force || read(FORCE_KEY);

  if (force === "native") {
    return;
  }

  // 浏览器到底有没有做跨文档转场, 只有导航结束才知道:
  // pagereveal 事件里带着 viewTransition 就是浏览器自己做了。
  window.addEventListener("pagereveal", function (event) {
    write(NATIVE_KEY, event.viewTransition ? "1" : "0");
  });

  var learned = read(NATIVE_KEY);
  var nativeApi = ("startViewTransition" in document) && ("CSSViewTransitionRule" in window);
  // Gecko 的实现不完整, 在拿到实测结论之前先按"不支持"处理, 宁可多走一次脚本动画
  var isFirefox = /Firefox\//.test(navigator.userAgent);
  var useNative = force !== "fallback" && nativeApi &&
    (learned === "1" || (learned !== "0" && !isFirefox));

  if (useNative) {
    return;
  }

  // ---------- 文章详情页: 标题滑进来 ----------
  if (read(FROM_LIST_KEY) === "1") {
    var detailTitle = document.querySelector("article.page.single > .single-title");
    if (detailTitle) {
      drop(FROM_LIST_KEY);
      detailTitle.classList.add("title-transition-enter");
      detailTitle.addEventListener("animationend", function () {
        detailTitle.classList.remove("title-transition-enter");
      }, { once: true });
    }
  }

  // ---------- 文章列表页: 点击的标题飞出去, 然后跳转 ----------
  var links = document.querySelectorAll('.home[data-home="posts"] .summary .single-title a');
  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey || link.target === "_blank" ||
          link.hasAttribute("download") || link.origin !== window.location.origin) {
        return;
      }

      var title = link.closest(".single-title");
      if (!title) {
        return;
      }

      write(FROM_LIST_KEY, "1");
      event.preventDefault();
      title.classList.add("title-transition-leave");
      window.setTimeout(function () {
        window.location.assign(link.href);
      }, DURATION);
    });
  });
})();
