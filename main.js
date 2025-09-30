// main.js
(function () {
  // Works even if header is injected later (delegation on document)
  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".nav-toggle");
    if (!btn) return;

    const isOpen = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
  }, true);

  // Close after clicking a menu link (better UX)
  document.addEventListener("click", function (e) {
    const link = e.target.closest("nav .nav-links a");
    if (!link) return;
    const nav = link.closest("nav");
    const btn = nav && nav.querySelector(".nav-toggle");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }, true);

  // Collapse if resized to desktop
  window.addEventListener("resize", function () {
    if (window.innerWidth >= 768) {
      document.querySelectorAll(".nav-toggle[aria-expanded='true']")
        .forEach((b) => b.setAttribute("aria-expanded", "false"));
    }
  });
})();
