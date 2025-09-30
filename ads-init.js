// ads-init.js
document.addEventListener('DOMContentLoaded', () => {
  try {
    // If you have multiple <ins class="adsbygoogle"> per page,
    // AdSense requires one push per slot:
    document.querySelectorAll('ins.adsbygoogle').forEach(() => {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  } catch (e) {
    console.error('AdSense init failed:', e);
  }
});
