---
layout: default
title: "NSE Market Dashboard Kenya"
seo_title: "NSE Share Prices Today, Gainers, Losers & Market Dashboard"
description: "Track the latest NSE share prices, top gainers and losers, most active shares, market turnover and major Nairobi Securities Exchange indices."
permalink: /nse-market-dashboard/
last_modified_at: "2026-09-25"
---

<link rel="stylesheet" href="{{ '/assets/css/nse-market-dashboard.css' | relative_url }}">

<main class="nse-dashboard" id="nseMarketDashboard"
  data-prices-url="{{ '/nse-market-prices.csv' | relative_url }}"
  data-indices-url="{{ '/nse-market-indices.csv' | relative_url }}"
  data-summary-url="{{ '/nse-market-summary.csv' | relative_url }}">

  <nav class="nse-dashboard__nav" aria-label="NSE dashboard navigation">
    <a href="{{ '/calculators/' | relative_url }}">Calculators &amp; tools</a>
    <span aria-hidden="true">|</span>
    <a href="{{ '/blog/invest-in-nse-index-kenya/' | relative_url }}">NSE investing guide</a>
  </nav>

  <header class="nse-dashboard__hero">
    <p class="nse-dashboard__eyebrow">Kenya market data</p>
    <h1>NSE Market Dashboard</h1>
    <p>Latest Nairobi Securities Exchange share prices, market movers, trading activity and index performance in one place.</p>
    <div class="nse-dashboard__date-row">
      <span id="nseDataDate" class="nse-dashboard__date">Loading latest market date…</span>
      <span id="nseDataStatus" class="nse-dashboard__status" aria-live="polite"></span>
    </div>
  </header>

  <section class="nse-dashboard__summary" aria-labelledby="nseSummaryHeading">
    <h2 id="nseSummaryHeading" class="sr-only">Market summary</h2>
    <article class="nse-stat-card">
      <span>Market capitalisation</span>
      <strong id="nseMarketCap">—</strong>
      <small>KSh billion</small>
    </article>
    <article class="nse-stat-card">
      <span>Shares traded</span>
      <strong id="nseSharesTraded">—</strong>
      <small>shares</small>
    </article>
    <article class="nse-stat-card">
      <span>Equity turnover</span>
      <strong id="nseTurnover">—</strong>
      <small>Kenyan shillings</small>
    </article>
    <article class="nse-stat-card">
      <span>Equity deals</span>
      <strong id="nseDeals">—</strong>
      <small>trades</small>
    </article>
  </section>

  <section class="nse-dashboard__movers" aria-labelledby="nseMoversHeading">
    <div class="nse-section-heading">
      <div>
        <p class="nse-section-heading__kicker">Daily movers</p>
        <h2 id="nseMoversHeading">Gainers, losers and most active shares</h2>
      </div>
    </div>
    <div class="nse-movers-grid">
      <article class="nse-mover-card">
        <h3>Top gainers</h3>
        <ol id="nseGainers" class="nse-mover-list"></ol>
      </article>
      <article class="nse-mover-card">
        <h3>Top losers</h3>
        <ol id="nseLosers" class="nse-mover-list"></ol>
      </article>
      <article class="nse-mover-card">
        <h3>Most active</h3>
        <ol id="nseMostActive" class="nse-mover-list"></ol>
      </article>
    </div>
  </section>

  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1110082069590452"
     crossorigin="anonymous"></script>
<!-- NSE Market Dashboard - After Movers -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-1110082069590452"
     data-ad-slot="4272690953"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>

  <section class="nse-dashboard__indices" aria-labelledby="nseIndicesHeading">
    <div class="nse-section-heading">
      <div>
        <p class="nse-section-heading__kicker">Indices</p>
        <h2 id="nseIndicesHeading">NSE index performance</h2>
      </div>
    </div>
    <div id="nseIndexCards" class="nse-index-grid"></div>
  </section>

  <section class="nse-dashboard__chart-section" aria-labelledby="nseChartHeading">
    <div class="nse-section-heading nse-section-heading--chart">
      <div>
        <p class="nse-section-heading__kicker">Price history</p>
        <h2 id="nseChartHeading">Track a share or index</h2>
      </div>
      <div class="nse-chart-controls">
        <label for="nseChartSeries">Security or index</label>
        <select id="nseChartSeries"></select>
        <label for="nseChartRange">Period</label>
        <select id="nseChartRange">
          <option value="30">1 month</option>
          <option value="90">3 months</option>
          <option value="180">6 months</option>
          <option value="365">1 year</option>
          <option value="0">All</option>
        </select>
      </div>
    </div>
    <div class="nse-chart-wrap">
      <canvas id="nseHistoryChart" aria-label="NSE market history chart" role="img"></canvas>
      <p id="nseChartEmpty" class="nse-chart-empty" hidden>More trading days are needed before a history line can be drawn.</p>
    </div>
  </section>

  <section class="nse-dashboard__prices" aria-labelledby="nsePricesHeading">
    <div class="nse-section-heading nse-section-heading--table">
      <div>
        <p class="nse-section-heading__kicker">Latest price list</p>
        <h2 id="nsePricesHeading">NSE share prices</h2>
      </div>
      <div class="nse-table-controls">
        <label for="nsePriceSearch" class="sr-only">Search NSE securities</label>
        <input id="nsePriceSearch" type="search" placeholder="Search company or ISIN" autocomplete="off">
        <label for="nseSectorFilter" class="sr-only">Filter by sector</label>
        <select id="nseSectorFilter"><option value="">All sectors</option></select>
      </div>
    </div>
    <div class="nse-table-wrap">
      <table class="nse-price-table">
        <thead>
          <tr>
            <th scope="col">Security</th>
            <th scope="col">VWAP</th>
            <th scope="col">Change</th>
            <th scope="col">High</th>
            <th scope="col">Low</th>
            <th scope="col">Volume</th>
            <th scope="col">52W range</th>
          </tr>
        </thead>
        <tbody id="nsePriceTableBody"></tbody>
      </table>
    </div>
    <p id="nseTableCount" class="nse-table-count" aria-live="polite"></p>
  </section>


  <section class="nse-dashboard__copy">
    <h2>How the dashboard works</h2>
    <p>The dashboard uses the daily NSE price list to show each security's volume-weighted average price (VWAP), previous price, daily high and low, volume and 52-week range. The change percentage compares VWAP with the previous price.</p>
    <p>Top gainers and losers include securities that recorded trading volume on the latest market date. Most active ranks securities by reported volume. Historical charts build automatically as new daily price lists are added.</p>
    <p>For broader market movement, the dashboard also tracks NASI, NSE 20, NSE 25, NSE 10 and the NSE Banking Sector Index.</p>
  </section>
</main>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js" defer></script>
<script src="{{ '/assets/js/nse-market-dashboard.js' | relative_url }}" defer></script>
