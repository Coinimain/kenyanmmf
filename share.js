/* share.js - Share popover + tracking + copy feedback (self-healing markup) */

function initShareButtons() {
  const shareBtn = document.getElementById("shareBtn");
  const fallback = document.getElementById("shareFallback");
  if (!shareBtn || !fallback) return;

  // Prevent double-init if script is included twice by mistake
  if (shareBtn.dataset.shareInit === "1") return;
  shareBtn.dataset.shareInit = "1";

  const url = window.location.href;
  const title = document.title;

  const encUrl = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);

// Inject icon-based fallback menu if empty (matches your CSS)
if (fallback.children.length === 0) {
  fallback.innerHTML = `
    <a id="shareX" class="share-icon" href="#" target="_blank" rel="noopener" aria-label="Share on X" title="Share on X">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.9 2H22l-6.8 7.8L23 22h-6.9l-5.4-7-6.1 7H2l7.3-8.4L1 2h7.1l4.9 6.4L18.9 2z"></path>
      </svg>
    </a>

    <a id="shareWhatsApp" class="share-icon" href="#" target="_blank" rel="noopener" aria-label="Share on WhatsApp" title="Share on WhatsApp">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.7 14.3c-.2.6-1.2 1.1-1.7 1.2-.4.1-.9.2-2-.2-2.6-1-4.6-3.8-4.7-3.9-.1-.1-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4.2.5.7 1.7.8 1.8.1.1.1.3 0 .5l-.3.6c-.1.2-.2.3-.1.5.2.4.8 1.3 1.7 2 .9.7 1.7 1 2 .8.2-.1.9-1 1.1-1.3.2-.3.4-.2.6-.1l1.8.9c.2.1.3.2.3.3 0 .1 0 .7-.2 1.3z"></path>
      </svg>
    </a>

    <a id="shareFacebook" class="share-icon" href="#" target="_blank" rel="noopener" aria-label="Share on Facebook" title="Share on Facebook">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.2-1.5 1.5-1.5h1.7V5c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5V11H7v3h2.7v8h3.8z"></path>
      </svg>
    </a>

    <a id="shareLinkedIn" class="share-icon" href="#" target="_blank" rel="noopener" aria-label="Share on LinkedIn" title="Share on LinkedIn">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.9 6.6a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4zM4.8 21.8V8.8H9v13H4.8zM13 8.8v1.8h.1c.6-1.1 2-2.2 4.1-2.2 4.4 0 5.2 2.9 5.2 6.7v6.7h-4.2v-5.9c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1v6H9.8V8.8H13z"></path>
      </svg>
    </a>

    <button id="copyLinkBtn" type="button" class="share-copy" aria-label="Copy link" title="Copy link">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"></path>
      </svg>
    </button>

<button id="shareNativeBtn" type="button" class="share-icon" aria-label="More" title="More">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="6" cy="12" r="2"></circle>
    <circle cx="12" cy="12" r="2"></circle>
    <circle cx="18" cy="12" r="2"></circle>
  </svg>
</button>

  `;
}

  // Grab elements (after injection)
  const copyBtn = document.getElementById("copyLinkBtn");

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

  // Guard to stop "open then immediately close" on the same interaction
  let justOpenedAt = 0;

  // Main share icon: toggle popover
  shareBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const willOpen = !isOpen();
    toggle();

    if (willOpen) justOpenedAt = Date.now();

    if (typeof trackShare === "function") {
      trackShare("toggle", { url, title });
    }
  });

  // "More…" inside popover: native share sheet (if supported)
  const nativeBtn = document.getElementById("shareNativeBtn");
  if (nativeBtn) {
    // Hide native button if not supported
    if (!navigator.share) {
      nativeBtn.style.display = "none";
    }

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

  // Close on outside click (pointerdown works well on mobile)
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!isOpen()) return;

      // Ignore the same interaction that opened it
      if (Date.now() - justOpenedAt < 150) return;

      const t = e.target;
      if (fallback.contains(t) || shareBtn.contains(t)) return;

      close();
    },
    { capture: true }
  );

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
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
    const originalHtml = copyBtn.innerHTML;

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
          copyBtn.innerHTML = originalHtml;
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
