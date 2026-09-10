/*
 * 「点开文章时标题滑动过去」的跨浏览器实现 (Firefox / 老 Safari 等)。
 *
 * 原生做法 (Chrome 126+ / Safari 18.2+) 完全由 CSS 完成:
 *   @view-transition { navigation: auto } + 两个页面标题共用一个 view-transition-name
 * Firefox 只是半成品 (有 @view-transition 规则, 缺 pageswap, 跨文档转场不一定执行),
 * 所以这里做了一条不依赖原生的路: 真正的共享元素动画 (FLIP)。
 *
 *   列表页点击 -> 记下标题的位置和字号 -> 正常跳转(不拖慢导航)
 *   文章页加载 -> 造一个浮动副本从原来的位置/字号飞到现在的位置, 飞完删掉, 显示真标题
 *
 * 因为两边标题文字是同一篇的标题, 飞过去视觉上就是"同一个标题在动"。
 *
 * 调试: 网址加 ?vt=fallback 强制走脚本, 加 ?vt=native 强制走原生, 跟随整个标签页。
 */
(function () {
  "use strict";

  var DURATION = 380;                              // 飞行动画时长
  var EASING = "cubic-bezier(.22, .61, .36, 1)";   // 和原生转场同一条缓动
  var FLY_KEY = "vt-fly";                          // 源标题的位置 / 字号
  var NATIVE_KEY = "vt-native";                    // 上一次导航浏览器有没有自己做转场
  var FORCE_KEY = "vt-force";                      // 调试开关

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
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

  var force = null;
  try {
    force = new URLSearchParams(window.location.search).get("vt");
  } catch (e) {
    force = null;
  }

  // ?vt=... 只在第一次带参数时生效, 之后跟随整个标签页, 方便点进文章后继续对比
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

  // ---------- 目标页: 让标题从列表里的位置飞过来 ----------
  var payload = null;
  try {
    payload = JSON.parse(read(FLY_KEY) || "null");
  } catch (e) {
    payload = null;
  }
  drop(FLY_KEY);

  var detailTitle = document.querySelector("article.page.single > .single-title");
  if (payload && detailTitle && payload.href === window.location.pathname) {
    flyTitle(payload, detailTitle);
  }

  // ---------- 列表页: 记下标题位置, 然后正常跳转 ----------
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

      var box = title.getBoundingClientRect();
      var style = window.getComputedStyle(title);
      write(FLY_KEY, JSON.stringify({
        href: link.pathname,
        text: title.textContent.trim(),
        left: Math.round(box.left),
        top: Math.round(box.top),
        fontSize: parseFloat(style.fontSize),
        fontWeight: style.fontWeight,
      }));
      // 这里不 preventDefault: 直接跳转, 动画放到新页面做, 不拖慢导航
    });
  });

  function flyTitle(from, target) {
    if (!window.Element.prototype.animate) {
      return;
    }

    var targetRect = target.getBoundingClientRect();
    var targetStyle = window.getComputedStyle(target);
    var targetSize = parseFloat(targetStyle.fontSize);
    var scale = targetSize / from.fontSize;

    var fly = document.createElement("span");
    fly.className = "title-fly";
    fly.setAttribute("aria-hidden", "true");
    fly.textContent = from.text;
    fly.style.position = "fixed";
    fly.style.left = from.left + "px";
    fly.style.top = from.top + "px";
    fly.style.margin = "0";
    fly.style.fontSize = from.fontSize + "px";
    fly.style.fontWeight = from.fontWeight;
    fly.style.lineHeight = "1.1";
    fly.style.whiteSpace = "nowrap";
    fly.style.color = targetStyle.color;
    fly.style.pointerEvents = "none";
    fly.style.zIndex = "9999";
    fly.style.transformOrigin = "left top";
    fly.style.willChange = "transform";
    document.body.appendChild(fly);

    // 真标题先藏起来, 飞完再显示
    target.style.visibility = "hidden";

    function reveal() {
      target.style.visibility = "";
      if (fly.parentNode) {
        fly.parentNode.removeChild(fly);
      }
    }

    var dx = Math.round((targetRect.left - from.left) * 100) / 100;
    var dy = Math.round((targetRect.top - from.top) * 100) / 100;

    var animation = fly.animate([
      { transform: "translate(0px, 0px) scale(1)" },
      { transform: "translate(" + dx + "px, " + dy + "px) scale(" + scale + ")" }
    ], { duration: DURATION, easing: EASING, fill: "forwards" });

    animation.onfinish = reveal;
    animation.oncancel = reveal;
    // 兜底: 万一动画没回调, 也别把标题永久藏起来
    window.setTimeout(reveal, DURATION + 400);
  }
})();
