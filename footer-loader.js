cd C:\Users\user\kenyanmmf
@'
(function () {
  function inject() {
    (async () => {
      try {
        const v = Date.now();
        const r = await fetch(`/footer.html?v=${v}`, { cache: "no-store" });
        if (!r.ok) throw new Error(`footer fetch ${r.status}`);
        const html = await r.text();
        const f = document.querySelector("footer");
        if (f) { f.outerHTML = html; }
        else { const d=document.createElement("div"); d.innerHTML=html; document.body.appendChild(d); }
        console.log("Footer loaded OK");
      } catch (e) { console.error("Footer load failed:", e); }
    })();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
  else inject();
})();
'@ | Set-Content footer-loader.js -Encoding UTF8
