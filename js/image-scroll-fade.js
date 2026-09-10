/*
 * 正文图片的滚动淡入淡出。
 *
 * 逻辑: 图片越靠近视口中间越实, 越靠近视口上下边缘越淡 ——
 *       所以滚进来时是淡入, 滚出去时是淡出, 连续跟手, 不是一次性动画。
 *
 * 想调节奏就改下面两个数:
 *   STRENGTH 越大, 边缘处越淡;  MIN 是保底不透明度(别设太低, 会像加载失败)。
 * 不想要这个效果就把 params.toml 里的 image-scroll-fade.js 去掉。
 */
(function () {
  "use strict";

  var STRENGTH = 0.62;   // 0 = 不淡, 1 = 边缘完全透明
  var MIN = 0.35;        // 最淡时保留的不透明度
  var MIN_WIDTH = 80;    // 太小的图(图标之类)不参与

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  var images = [];
  var ticking = false;
  var lastValues = [];

  function collect() {
    images = [];
    lastValues = [];
    var nodes = document.querySelectorAll(".page .content img");
    Array.prototype.forEach.call(nodes, function (img) {
      // 排除代码块里的图、被隐藏的图
      if (img.closest("pre") || img.closest(".highlight")) return;
      images.push(img);
      lastValues.push(-1);
      img.style.opacity = "1";
      // 懒加载的图加载完才有尺寸, 加载完重新算一次
      img.addEventListener("load", onScroll, { once: true });
    });
  }

  function update() {
    ticking = false;
    if (!images.length) return;

    var vh = window.innerHeight || document.documentElement.clientHeight;
    var middle = vh / 2;

    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      var rect = img.getBoundingClientRect();

      if (rect.width < MIN_WIDTH || rect.height === 0) continue;
      var opacity = 1;

      // 比视口还高的图(整屏大图)不参与, 否则一半屏幕都得是淡的
      if (rect.height < vh * 1.05) {
        // 图片中心离视口中心多远, 归一到 0(正中) ~ 1(到视口上下边缘)
        var center = rect.top + rect.height / 2;
        var d = Math.abs(center - middle) / middle;
        if (d > 1) d = 1;

        // 用平方衰减: 中间基本是实的, 靠近边缘才明显变淡, 不至于整页发虚
        opacity = 1 - STRENGTH * d * d;
        if (opacity < MIN) opacity = MIN;
      }

      // 变化不大就不写样式, 省得每帧都触发重绘
      if (Math.abs(opacity - lastValues[i]) > 0.01) {
        lastValues[i] = opacity;
        img.style.opacity = opacity.toFixed(3);
      }
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  function start() {
    collect();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", onScroll);
    // 图片懒加载把版面撑开之后, 再补算一次
    window.setTimeout(onScroll, 600);
    window.setTimeout(onScroll, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
