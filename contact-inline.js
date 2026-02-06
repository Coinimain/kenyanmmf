// Legacy footer injector disabled (footer is rendered by Jekyll include)
return;

﻿// extracted from contact.html
(function () {
    function inject() {
      (async () => {
        try {
          const v = Date.now(); // cache-buster
          if (!r.ok) throw new Error(`footer fetch ${r.status}`);
          const html = await r.text();
          const f = document.querySelector("footer");
          if (f) {
            f.outerHTML = html; // replace whole footer
          } else {
            const d = document.createElement("div");
            d.innerHTML = html;
            document.body.appendChild(d);
          }
          console.log("Footer loaded OK");
        } catch (e) {
          console.error("Footer load failed:", e);
        }
      })();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inject);
    } else {
      inject();
    }
  })();
