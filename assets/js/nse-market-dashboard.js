(() => {
  "use strict";
  const root = document.getElementById("nseMarketDashboard");
  if (!root) return;

  const state = { prices: [], indices: [], summary: [], latestPrices: [], latestIndices: [], latestDate: "", chart: null };
  const $ = (id) => document.getElementById(id);
  const nf = new Intl.NumberFormat("en-KE");
  const money = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });
  const priceFmt = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') quoted = false;
        else field += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(field); field = ""; }
      else if (ch === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
      else field += ch;
    }
    if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
    const headers = rows.shift() || [];
    return rows.filter(r => r.some(v => v !== "")).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
  }

  async function loadCSV(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${url}`);
    return parseCSV(await response.text());
  }

  const num = (v) => { const n = Number(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : null; };
  const changeClass = (v) => v > 0 ? "nse-change--up" : v < 0 ? "nse-change--down" : "nse-change--flat";
  const arrow = (v) => v > 0 ? "▲" : v < 0 ? "▼" : "•";
  const formatDate = (iso) => new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00`));
  const esc = (s) => String(s ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

  function renderSummary() {
    const s = [...state.summary].sort((a, b) => a.Date.localeCompare(b.Date)).at(-1);
    if (!s) return;
    $("nseMarketCap").textContent = nf.format(num(s["Market Capitalization (KES bn)"]) ?? 0);
    $("nseSharesTraded").textContent = nf.format(num(s["Shares Traded"]) ?? 0);
    const turnover = num(s["Equity Turnover (KES)"]);
    $("nseTurnover").textContent = turnover === null ? "—" : `KSh ${money.format(turnover)}`;
    $("nseDeals").textContent = nf.format(num(s["Total Deals"]) ?? 0);
  }

  function latestRows(rows) {
    const date = rows.reduce((max, r) => r.Date > max ? r.Date : max, "");
    return { date, rows: rows.filter(r => r.Date === date) };
  }

  function moverItem(r, mode) {
    const pct = num(r["Change (%)"]);
    const volume = num(r.Volume);
    let value = mode === "volume" ? `${nf.format(volume ?? 0)} shares` : `${arrow(pct)} ${pct >= 0 ? "+" : ""}${(pct ?? 0).toFixed(2)}%`;
    let cls = mode === "volume" ? "nse-change--flat" : changeClass(pct);
    return `<li><span class="nse-mover-name" title="${esc(r.Security)}">${esc(r.Security)}</span><span class="nse-mover-value ${cls}">${esc(value)}</span></li>`;
  }

  function renderMovers() {
    const traded = state.latestPrices.filter(r => (num(r.Volume) ?? 0) > 0 && num(r["Change (%)"]) !== null);
    const gainers = [...traded].filter(r => num(r["Change (%)"]) > 0).sort((a,b) => num(b["Change (%)"]) - num(a["Change (%)"])).slice(0,5);
    const losers = [...traded].filter(r => num(r["Change (%)"]) < 0).sort((a,b) => num(a["Change (%)"]) - num(b["Change (%)"])).slice(0,5);
    const active = [...traded].sort((a,b) => num(b.Volume) - num(a.Volume)).slice(0,5);
    $("nseGainers").innerHTML = gainers.map(r => moverItem(r, "change")).join("") || "<li>No gainers reported.</li>";
    $("nseLosers").innerHTML = losers.map(r => moverItem(r, "change")).join("") || "<li>No losers reported.</li>";
    $("nseMostActive").innerHTML = active.map(r => moverItem(r, "volume")).join("") || "<li>No volume reported.</li>";
  }

  function renderIndices() {
    $("nseIndexCards").innerHTML = state.latestIndices.map(r => {
      const close = num(r.Close), pct = num(r["Change (%)"]);
      return `<article class="nse-index-card"><span>${esc(r.Index)}</span><strong>${close === null ? "—" : nf.format(close)}</strong><small class="${changeClass(pct)}">${arrow(pct)} ${pct >= 0 ? "+" : ""}${(pct ?? 0).toFixed(2)}%</small></article>`;
    }).join("");
  }

  function renderFilters() {
    const sector = $("nseSectorFilter");
    const sectors = [...new Set(state.latestPrices.map(r => r.Sector).filter(Boolean))].sort();
    sector.innerHTML = '<option value="">All sectors</option>' + sectors.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
    const select = $("nseChartSeries");
    const indices = [...new Set(state.indices.map(r => r.Index))].sort();
    const securities = [...new Map(state.prices.map(r => [r.ISIN, r.Security])).entries()].sort((a,b) => a[1].localeCompare(b[1]));
    select.innerHTML = '<optgroup label="Indices">' + indices.map(name => `<option value="index:${esc(name)}">${esc(name)}</option>`).join("") + '</optgroup>' +
      '<optgroup label="Securities">' + securities.map(([isin,name]) => `<option value="security:${esc(isin)}">${esc(name)}</option>`).join("") + '</optgroup>';
    const nasi = [...select.options].find(o => o.value.includes("NSE All Share Index"));
    if (nasi) nasi.selected = true;
  }

  function renderTable() {
    const query = $("nsePriceSearch").value.trim().toLowerCase();
    const sector = $("nseSectorFilter").value;
    const rows = state.latestPrices.filter(r => {
      const hay = `${r.Security} ${r.ISIN}`.toLowerCase();
      return (!query || hay.includes(query)) && (!sector || r.Sector === sector);
    }).sort((a,b) => a.Security.localeCompare(b.Security));
    $("nsePriceTableBody").innerHTML = rows.map(r => {
      const pct = num(r["Change (%)"]), vwap = num(r.VWAP), high = num(r.High), low = num(r.Low), volume = num(r.Volume), hi52 = num(r["52W High"]), lo52 = num(r["52W Low"]);
      const change = pct === null ? "—" : `${arrow(pct)} ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
      return `<tr><td><span class="nse-security-name" title="${esc(r.Security)}">${esc(r.Security)}</span><span class="nse-security-meta">${esc(r.Sector)} · ${esc(r.ISIN)}</span></td><td>${vwap === null ? "—" : priceFmt.format(vwap)}</td><td class="${changeClass(pct)}"><strong>${change}</strong></td><td>${high === null ? "—" : priceFmt.format(high)}</td><td>${low === null ? "—" : priceFmt.format(low)}</td><td>${volume === null ? "—" : nf.format(volume)}</td><td>${lo52 === null || hi52 === null ? "—" : `${priceFmt.format(lo52)}–${priceFmt.format(hi52)}`}</td></tr>`;
    }).join("");
    $("nseTableCount").textContent = `${nf.format(rows.length)} securities shown`;
  }

  function renderChart() {
    if (typeof Chart === "undefined") return;
    const [kind, key] = $("nseChartSeries").value.split(/:(.+)/);
    const range = Number($("nseChartRange").value);
    let points = [], label = "";
    if (kind === "index") {
      label = key;
      points = state.indices.filter(r => r.Index === key).map(r => ({ date:r.Date, value:num(r.Close) })).filter(p => p.value !== null);
    } else {
      const rows = state.prices.filter(r => r.ISIN === key);
      label = rows[0]?.Security || key;
      points = rows.map(r => ({ date:r.Date, value:num(r.VWAP) })).filter(p => p.value !== null);
    }
    points.sort((a,b) => a.date.localeCompare(b.date));
    if (range && points.length) {
      const cutoff = new Date(`${points.at(-1).date}T12:00:00`); cutoff.setDate(cutoff.getDate() - range);
      points = points.filter(p => new Date(`${p.date}T12:00:00`) >= cutoff);
    }
    const empty = $("nseChartEmpty");
    empty.hidden = points.length > 1;
    if (state.chart) state.chart.destroy();
    state.chart = new Chart($("nseHistoryChart"), { type:"line", data:{ labels:points.map(p => p.date), datasets:[{ label, data:points.map(p => p.value), borderWidth:2, pointRadius:points.length > 60 ? 0 : 2, tension:.15 }] }, options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:"index",intersect:false}, plugins:{legend:{display:false}}, scales:{x:{ticks:{maxTicksLimit:8}},y:{beginAtZero:false}} } });
  }

  async function init() {
    try {
      $("nseDataStatus").textContent = "Loading market data…";
      [state.prices, state.indices, state.summary] = await Promise.all([
        loadCSV(root.dataset.pricesUrl), loadCSV(root.dataset.indicesUrl), loadCSV(root.dataset.summaryUrl)
      ]);
      const p = latestRows(state.prices), i = latestRows(state.indices);
      state.latestDate = p.date;
      state.latestPrices = p.rows;
      state.latestIndices = i.rows.filter(r => r.Date === p.date || i.date === p.date);
      if (!state.latestIndices.length) state.latestIndices = i.rows;
      $("nseDataDate").textContent = state.latestDate ? `Market date: ${formatDate(state.latestDate)}` : "No market date available";
      $("nseDataStatus").textContent = `${nf.format(state.latestPrices.length)} securities loaded`;
      renderSummary(); renderMovers(); renderIndices(); renderFilters(); renderTable(); renderChart();
      $("nsePriceSearch").addEventListener("input", renderTable);
      $("nseSectorFilter").addEventListener("change", renderTable);
      $("nseChartSeries").addEventListener("change", renderChart);
      $("nseChartRange").addEventListener("change", renderChart);
    } catch (error) {
      console.error(error);
      $("nseDataStatus").textContent = "Market data could not be loaded.";
    }
  }
  init();
})();
