/* Firefox fallback for the LoveIt title transition. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nativeViewTransitions = "startViewTransition" in document;

  if (nativeViewTransitions || reduceMotion) {
    return;
  }

  var links = document.querySelectorAll(
    '.home[data-home="posts"] .summary .single-title a'
  );

  links.forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.origin !== window.location.origin
      ) {
        return;
      }

      var title = link.closest(".single-title");
      if (!title) {
        return;
      }

      event.preventDefault();
      title.classList.add("title-transition-leave");
      window.setTimeout(function () {
        window.location.assign(link.href);
      }, 420);
    });
  });

  var detailTitle = document.querySelector("article.page.single > .single-title");
  if (detailTitle) {
    detailTitle.classList.add("title-transition-enter");
  }
})();
