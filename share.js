/* share.js - Share popover + tracking + copy feedback */

function initShareButtons() {
  const shareBtn = document.getElementById("shareBtn");
  const fallback = document.getElementById("shareFallback");
  if (!shareBtn || !fallback) return;

  const copyBtn = document.getElementById("copyLinkBtn");

  const url = window.location.href;
  const title = document.title;

  const encUrl = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);

  const x = document.getElementById("shareX");
  const wa = document.getElementById("shareWhatsApp");
  const fb = document.getElementById("shareFacebook");
  const li = document.getElementById("shareLinkedIn");

  if (x) x.href = `https://twitter.com/intent/tweet?text=${encTitle}&url=${encUrl}`;
  if (wa) wa.href = `https://wa.me/?text=${encTitle}%20${encUrl}`;
  if (fb) fb.href = `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`;
  if (li) li.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`;

  function setOpen(open) {
    fallback.hidden = !open;
    shareBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function isOpen() {
    return !fallback.hidden;
  }

  function close() {
    setOpen(false);
  }

  function toggle() {
    setOpen(!isOpen());
  }

  // Start closed
  close();

// Click share icon: ALWAYS toggle popover (desktop + mobile)
shareBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  toggle();
  if (typeof trackShare === "function") trackShare("toggle", { url, title });
});

// Mobile-only "More" button inside popover: opens native share sheet
const nativeBtn = document.getElementById("shareNativeBtn");
if (nativeBtn) {
  nativeBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!navigator.share) return;

    try {
      await navigator.share({ title, text: title, url });
      if (typeof trackShare === "function") trackShare("native_more", { url, title });
    } catch (_) {
      // user cancelled
    }

    close();
  });
}


  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!isOpen()) return;
    if (fallback.contains(e.target) || shareBtn.contains(e.target)) return;
    close();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  // Track + close when clicking a share link
  fallback.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;

    let method = "link";
    if (a.id === "shareX") method = "x";
    else if (a.id === "shareWhatsApp") method = "whatsapp";
    else if (a.id === "shareFacebook") method = "facebook";
    else if (a.id === "shareLinkedIn") method = "linkedin";

    if (typeof trackShare === "function") trackShare(method, { url, title });
    close();
  });

  // Copy button with checkmark swap
  if (copyBtn) {
    const checkIcon =
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/></svg>`;
    const originalIcon = copyBtn.innerHTML;

    copyBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        await navigator.clipboard.writeText(url);
        if (typeof trackShare === "function") trackShare("copy", { url, title });

        copyBtn.innerHTML = checkIcon;
        copyBtn.setAttribute("data-copied", "true");
        copyBtn.setAttribute("aria-label", "Copied!");

        setTimeout(() => {
          copyBtn.innerHTML = originalIcon;
          copyBtn.removeAttribute("data-copied");
          copyBtn.setAttribute("aria-label", "Copy link");
        }, 1200);

        close();
      } catch (err) {
        if (typeof trackShare === "function") trackShare("copy_prompt", { url, title });
        close();
        window.prompt("Copy this link:", url);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", initShareButtons);
