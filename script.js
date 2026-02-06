/* ---- Kenya MMF site script (final, stable) ---- */

let funds = [];
let exchangeRate = 129; // fallback only

const FX_CACHE_KEY = "usd_kes_rate_v1";
const FX_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
const FX_API = "https://open.er-api.com/v6/latest/USD";

// ---------- Utils ----------
const $id = (id) => document.getElementById(id);
const hasEl = (id) => !!$id(id);

const fmtKES = (n) =>
  `KES ${n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtUSD = (n) =>
  `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function shortProviderName(provider) {
  const p = (provider || "").toLowerCase();
  if (p.includes("cytonn")) return "Cytonn";
  if (p.includes("gcib") || p.includes("gulfcap")) return "Gulfcap";
  if (p.includes("etica")) return "Etica";
  if (p.includes("kuza")) return "Kuza";
  if (p.includes("lofty corban")) return "Lofty Corban";
  if (p.includes("british-american") || p.includes("britam")) return "Britam";
  if (p.includes("icea")) return "ICEA";
  if (p.includes("african alliance")) return "African Alliance";
  if (p.includes("arvocap")) return "Arvocap";
  if (p.includes("nabo")) return "Nabo";
  if (p.includes("enwealth")) return "Enwealth";

  const words = provider.split(" ").filter(Boolean);
  return words.slice(0, 2).join(" ") || provider;
}

function parseUpdatedDate(lastUpdated) {
  const t = Date.parse(lastUpdated);
  return Number.isNaN(t) ? 0 : t;
}

// ---------- FX ----------
async function loadUsdKesRate() {
  try {
    const cached = localStorage.getItem(FX_CACHE_KEY);
    if (cached) {
      const obj = JSON.parse(cached);
      if (Date.now() - obj.ts < FX_CACHE_TTL) {
        exchangeRate = obj.rate;
        return;
      }
    }

    const res = await fetch(FX_API);
    const json = await res.json();
    if (json?.rates?.KES) {
      exchangeRate = json.rates.KES;
      localStorage.setItem(
        FX_CACHE_KEY,
        JSON.stringify({ rate: exchangeRate, ts: Date.now() })
      );
    }
  } catch {
    // silent fallback
  }
}

// ---------- Providers ----------
async function loadProviders() {
  const select = $id("provider");
  if (!select) return;

  const res = await fetch("data.csv", { cache: "no-store" });
  const text = await res.text();
  const rows = text.split("\n").slice(1);

  select.innerHTML = `<option value="">Select a provider</option>`;
  funds = [];

  rows.forEach((row, idx) => {
    if (!row.trim()) return;

    const [
      provider,
      fundName,
      rate,
      fees,
      minInvestment,
      payoutFrequency,
      lastUpdated,
      currency,
    ] = row.split(",").map((v) => (v ?? "").trim());

    const rateNum = parseFloat(rate);
    if (!provider || !fundName || Number.isNaN(rateNum) || !currency) return;

    funds.push({
      provider,
      fundName,
      rate: rateNum,
      fees: parseFloat(fees) || 0,
      minInvestment: parseFloat(minInvestment) || 0,
      payoutFrequency,
      lastUpdated,
      updatedTs: parseUpdatedDate(lastUpdated),
      currency,
    });

    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `${provider} - ${fundName} (${rateNum}%) [${currency}]`;
    select.appendChild(opt);
  });

  select.addEventListener("change", updateCurrencyLabels);

  generateComparisonChart();
}

function updateCurrencyLabels() {
  const idx = $id("provider")?.value;
  if (idx === "" || !funds[idx]) return;

  const cur = funds[idx].currency === "USD" ? "USD" : "KES";
  const initialLabel = $id("initialLabel");
  const monthlyLabel = $id("monthlyLabel");
  if (initialLabel) initialLabel.textContent = `Initial Investment (${cur}):`;
  if (monthlyLabel) monthlyLabel.textContent = `Monthly Contribution (${cur}):`;
}

// ---------- Chart (10 bars, alternates KES/USD, NEVER repeat same provider back-to-back) ----------
function generateComparisonChart() {
  const canvas = $id("mmfChart");
  if (!canvas || !window.Chart) return;

  if (window.mmfChartInstance) {
    try {
      window.mmfChartInstance.destroy();
    } catch {}
  }

  // 1) Keep latest row per provider+currency+fundName (so “slightly different name” survives)
  const latestByKey = new Map();
  for (const f of funds) {
    const key = `${f.provider}__${f.currency}__${f.fundName}`;
    const prev = latestByKey.get(key);
    if (!prev || (f.updatedTs || 0) > (prev.updatedTs || 0)) {
      latestByKey.set(key, f);
    }
  }
  const latestFunds = Array.from(latestByKey.values());
  if (!latestFunds.length) return;

  // 2) Group by provider, but store ALL KES funds + ALL USD funds (not just one)
  const byProvider = new Map();
  for (const f of latestFunds) {
    if (!byProvider.has(f.provider)) {
      byProvider.set(f.provider, {
        provider: f.provider,
        label: shortProviderName(f.provider),
        KES: [],
        USD: [],
      });
    }
    const entry = byProvider.get(f.provider);
    if (f.currency === "KES") entry.KES.push(f);
    if (f.currency === "USD") entry.USD.push(f);
  }

  // Sort each provider bucket by rate desc, then recency
  for (const p of byProvider.values()) {
    p.KES.sort((a, b) => (b.rate - a.rate) || ((b.updatedTs || 0) - (a.updatedTs || 0)));
    p.USD.sort((a, b) => (b.rate - a.rate) || ((b.updatedTs || 0) - (a.updatedTs || 0)));
  }

  const providers = Array.from(byProvider.values());

  // 3) Sort providers by their best KES rate (fallback to best USD)
  providers.sort((a, b) => {
    const ar = a.KES[0]?.rate ?? a.USD[0]?.rate ?? 0;
    const br = b.KES[0]?.rate ?? b.USD[0]?.rate ?? 0;
    return br - ar;
  });

  if (!providers.length) {
    canvas.style.display = "none";
    return;
  }
  canvas.style.display = "";

  const MAX_BARS = 10;
  const labels = [];
  const rates = [];

  // helper: choose a fund for a slot that avoids repeating previous provider labelKey
  function pickForSlot(wantCurrency, lastProviderName, startIndex) {
    const n = providers.length;
    if (!n) return null;

    // Try up to n providers to find best fit without repeating provider back-to-back
    for (let step = 0; step < n; step++) {
      const i = (startIndex + step) % n;
      const p = providers[i];

      // Do not use same provider as previous bar if we can avoid it
      if (p.label === lastProviderName && step < n - 1) {
        continue;
      }

      // primary choice
      let chosen =
        wantCurrency === "KES"
          ? (p.KES[0] || p.USD[0] || null)
          : (p.USD[0] || null);

      // for USD slot fallback rules:
      // If USD missing -> use a KES fund from a DIFFERENT provider (not the same provider again)
      if (wantCurrency === "USD" && !chosen) {
        chosen = p.KES[0] || p.USD[0] || null;
      }

      if (!chosen) continue;

      const tag = chosen.currency === "USD" ? "USD" : "KES";
      return {
        providerIndex: i,
        providerLabel: p.label,
        label: `${p.label} [${tag}]`,
        rate: chosen.rate,
      };
    }

    // If we *must* repeat (only 1 provider exists), allow it
    const p = providers[startIndex % providers.length];
    const chosen =
      wantCurrency === "KES"
        ? (p.KES[0] || p.USD[0] || null)
        : (p.USD[0] || p.KES[0] || null);

    if (!chosen) return null;
    const tag = chosen.currency === "USD" ? "USD" : "KES";
    return {
      providerIndex: startIndex % providers.length,
      providerLabel: p.label,
      label: `${p.label} [${tag}]`,
      rate: chosen.rate,
    };
  }

  // We advance the provider every 2 bars to keep the “paired” feel,
  // but if USD is missing we will still advance so we don’t duplicate.
  let providerIndex = 0;
  let lastProviderLabel = "";

  for (let slot = 0; slot < MAX_BARS; slot++) {
    const wantKES = slot % 2 === 0;
    const wantCurrency = wantKES ? "KES" : "USD";

    const pick = pickForSlot(wantCurrency, lastProviderLabel, providerIndex);
    if (!pick) break;

    labels.push(pick.label);
    rates.push(pick.rate);
    lastProviderLabel = pick.providerLabel;

    // advance provider after USD slot ALWAYS (so we don’t get “KES then fallback KES” from same provider)
    if (!wantKES) {
      providerIndex = (pick.providerIndex + 1) % providers.length;
    } else {
      // keep provider index for trying paired USD next
      providerIndex = pick.providerIndex;
    }
  }

  // if for any reason we didn't fill 10, keep filling KES (still avoiding immediate repeats)
  while (labels.length < MAX_BARS) {
    const pick = pickForSlot("KES", lastProviderLabel, providerIndex + 1);
    if (!pick) break;
    labels.push(pick.label);
    rates.push(pick.rate);
    lastProviderLabel = pick.providerLabel;
    providerIndex = (pick.providerIndex + 1) % providers.length;
  }

  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short" });
  const year = now.getFullYear();
  const ctx = canvas.getContext("2d");

  window.mmfChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Annual Return (%)",
          data: rates,
          backgroundColor: "#2E7D32",
          borderColor: "#1B5E20",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: `Top MMF Providers (${month} ${year})` },
        tooltip: {
          callbacks: {
            label(ctx) {
              return `Return: ${ctx.parsed.y.toFixed(2)}%`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Annualized Return (%)" },
        },
      },
    },
  });
}

// ---------- Tooltip ----------
function hideAllTooltips(except = null) {
  document.querySelectorAll(".fx-tooltip").forEach((t) => {
    if (except && except.contains(t)) return;
    t.style.opacity = "0";
  });
}

function attachTooltipHandlers(container) {
  if (!window.__fxOutsideClickBound) {
    window.__fxOutsideClickBound = true;
    document.addEventListener(
      "click",
      (e) => {
        if (!e.target.closest(".fx-info")) hideAllTooltips();
      },
      true
    );
  }

  container.querySelectorAll(".fx-info").forEach((wrap) => {
    const tip = wrap.querySelector(".fx-tooltip");
    if (!tip) return;

    wrap.addEventListener("mouseenter", () => {
      hideAllTooltips(wrap);
      tip.style.opacity = "1";
    });

    wrap.addEventListener("mouseleave", () => {
      tip.style.opacity = "0";
    });

    wrap.addEventListener("click", (e) => {
      e.stopPropagation();
      tip.style.opacity = tip.style.opacity === "1" ? "0" : "1";
    });
  });
}

// ---------- Calculator ----------
function calculateReturns() {
  const idx = $id("provider")?.value;
  const results = $id("results");

  if (idx === "" || !funds[idx]) {
    results.innerHTML = "Please select a provider.";
    return;
  }

  const fund = funds[idx];
  const rate = fund.rate / 100;

  const initial = parseFloat($id("initial").value);
  const monthly = parseFloat($id("monthly").value) || 0;
  const years = parseFloat($id("years").value);

  if (Number.isNaN(initial) || Number.isNaN(years)) {
    results.innerHTML = "Please fill all required fields.";
    return;
  }

  let total = initial;
  const months = Math.floor(years * 12);

  for (let i = 0; i < months; i++) {
    total += monthly;
    total *= 1 + rate / 12;
  }

  const infoIcon = `
    <span class="fx-info" style="position:relative; display:inline-block; margin-left:6px;">
      <svg width="16" height="16" viewBox="0 0 16 16"
        xmlns="http://www.w3.org/2000/svg"
        style="vertical-align: middle; cursor: pointer;">
        <circle cx="8" cy="8" r="7" fill="none" stroke="#2E7D32" stroke-width="1.5"/>
        <circle cx="8" cy="4.5" r="1" fill="#2E7D32"/>
        <line x1="8" y1="6.5" x2="8" y2="11.5"
          stroke="#2E7D32" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span class="fx-tooltip"
        style="
          position:absolute;
          bottom:125%;
          left:50%;
          transform:translateX(-50%);
          background:#fff;
          color:#222;
          padding:0.5rem 0.6rem;
          border-radius:6px;
          font-size:0.85rem;
          line-height:1.35;
          box-shadow:0 4px 14px rgba(0,0,0,0.15);
          width:260px;
          opacity:0;
          pointer-events:none;
          transition:opacity 0.15s ease;
          z-index:10;
        ">
        Approximate currency conversion using the current USD–KES exchange rate.
        Returns are calculated in the fund’s base currency.
      </span>
    </span>
  `;

  let html = `
    <p><strong>Estimated Returns:</strong>
      ${fund.currency === "USD" ? fmtUSD(total) : fmtKES(total)}
    </p>
    <p><strong>Minimum Investment Required:</strong>
      ${fund.currency === "USD"
        ? fmtUSD(fund.minInvestment)
        : fmtKES(fund.minInvestment)}
    </p>
  `;

  if (fund.currency === "USD") {
    html += `<p>(Equivalent: ${fmtKES(total * exchangeRate)})${infoIcon}</p>`;
  } else {
    html += `<p>(Equivalent: ${fmtUSD(total / exchangeRate)})${infoIcon}</p>`;
  }

  results.innerHTML = html;
  attachTooltipHandlers(results);
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", async () => {
  await loadUsdKesRate();
  if (hasEl("provider")) loadProviders();
  if (hasEl("calculateButton"))
    $id("calculateButton").addEventListener("click", calculateReturns);
});

// ---- Auto-wrap post tables + show swipe hint only when overflowing ----
(function () {
  function wrapPostTables() {
    document.querySelectorAll(".post-content table").forEach((table) => {
      // Skip tables already wrapped or explicitly opted out
      if (table.closest(".table-wrap")) return;
      if (table.classList.contains("no-table-wrap")) return;

      const wrap = document.createElement("div");
      wrap.className = "table-wrap";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function updateTableOverflowHints() {
    document.querySelectorAll(".table-wrap").forEach((wrap) => {
      const isOverflowing = wrap.scrollWidth > wrap.clientWidth + 1;
      wrap.classList.toggle("is-overflowing", isOverflowing);
    });
  }

  function run() {
    wrapPostTables();
    updateTableOverflowHints();
  }

  // Fast first paint
  document.addEventListener("DOMContentLoaded", run);

  // Safe fallback after all assets load
  window.addEventListener("load", run);

  // Re-check on resize/orientation change
  window.addEventListener("resize", updateTableOverflowHints);
  window.addEventListener("orientationchange", updateTableOverflowHints);
})();
