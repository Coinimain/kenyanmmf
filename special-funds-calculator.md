---
layout: default
title: "Special Funds Calculator Kenya"
seo_title: "Special Funds Calculator Kenya: Mansa-X, Oak & Etica"
description: "Project returns for Mansa-X, Oak, Etica and other Special Funds in Kenya using a lump sum, monthly contributions and an editable net annual return."
permalink: /special-funds-calculator/
last_modified_at: "2026-09-23"
---

<link rel="stylesheet" href="{{ '/assets/css/special-funds-calculator.css' | relative_url }}">

<main class="special-funds-page">
  <nav class="special-funds-page__nav" aria-label="Special Funds Calculator navigation">
    <a href="{{ '/calculators/' | relative_url }}">All calculators</a>
    <span aria-hidden="true">|</span>
    <a href="{{ '/blog/special-funds-in-kenya/' | relative_url }}">Special Funds guide</a>
  </nav>

  <header class="special-funds-hero">
    <p class="special-funds-hero__eyebrow">Free investment calculator</p>
    <h1>Special Funds Calculator Kenya</h1>
    <p>Estimate how a lump sum and monthly contributions could grow in Mansa-X, Oak, Etica and the other Special Funds reported by the CMA.</p>
    <a class="special-funds-hero__button" href="#specialFundsCalculator">Start calculating</a>
  </header>

  <section
    id="specialFundsCalculator"
    class="special-funds-calculator"
    data-csv-url="{{ '/special-funds-data.csv' | relative_url }}"
    data-bond-url="{{ '/kenya-10y-bond-data.csv' | relative_url }}"
    aria-labelledby="specialFundsCalculatorHeading"
  >
    <div class="special-funds-calculator__heading">
      <div>
        <p class="special-funds-calculator__kicker">Investment projection</p>
        <h2 id="specialFundsCalculatorHeading">Calculate your projected fund value</h2>
      </div>
      <span id="specialFundsDataStatus" class="special-funds-calculator__data-status">Loading fund data…</span>
    </div>

    <form id="specialFundsForm" class="special-funds-calculator__form" novalidate>
      <div class="special-funds-calculator__field">
        <label for="specialFund">Select Special Fund</label>
        <select id="specialFund" name="specialFund" required disabled>
          <option value="">Loading funds…</option>
        </select>
      </div>

      <details id="specialFundDetails" class="special-funds-calculator__fund-disclosure" hidden>
        <summary class="special-funds-calculator__fund-summary">
          <span>Fund details</span>

        </summary>
        <div id="specialFundDetailsContent" class="special-funds-calculator__fund-details" aria-live="polite"></div>
      </details>

      <div class="special-funds-calculator__field">
        <label id="specialInitialLabel" for="specialInitial">Initial investment</label>
        <input
          id="specialInitial"
          name="specialInitial"
          type="number"
          min="0"
          max="1000000000000000"
          step="0.01"
          inputmode="decimal"
          autocomplete="off"
          placeholder="e.g. 250000"
          required
        >
      </div>

      <div class="special-funds-calculator__field">
        <label id="specialMonthlyLabel" for="specialMonthly">Monthly contribution</label>
        <input
          id="specialMonthly"
          name="specialMonthly"
          type="number"
          min="0"
          max="1000000000000000"
          step="0.01"
          inputmode="decimal"
          autocomplete="off"
          value="0"
          required
        >
      </div>

      <div class="special-funds-calculator__field">
        <div class="special-funds-calculator__label-row">
          <label for="specialAnnualRate">Net annual return (%)</label>
          <span id="specialRateSource" class="special-funds-calculator__rate-source"></span>
        </div>
        <input
          id="specialAnnualRate"
          name="specialAnnualRate"
          type="number"
          min="-99.99"
          max="200"
          step="0.01"
          inputmode="decimal"
          autocomplete="off"
          placeholder="Enter the latest net annual return"
          required
        >
        <p class="special-funds-calculator__help">Published annualised rates fill automatically where available. You can edit the rate.</p>
      </div>

      <div class="special-funds-calculator__field">
        <label for="specialYears">Investment period (years)</label>
        <input
          id="specialYears"
          name="specialYears"
          type="number"
          min="0.25"
          max="50"
          step="0.25"
          inputmode="decimal"
          autocomplete="off"
          value="1"
          required
        >
      </div>

      <div id="specialFundsValidation" class="special-funds-calculator__validation" role="alert" hidden></div>

      <button id="specialFundsCalculate" class="special-funds-calculator__button" type="submit">Calculate projected value</button>
    </form>

    <div id="specialFundsResults" class="special-funds-calculator__results" aria-live="polite" aria-atomic="true">
      <p class="special-funds-calculator__empty-result">Select a fund and enter your investment to see the projection.</p>
    </div>
  </section>

  <div class="special-funds-page__ad" aria-label="Advertisement">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1110082069590452"
         crossorigin="anonymous"></script>
    <ins class="adsbygoogle"
         style="display:block; text-align:center;"
         data-ad-layout="in-article"
         data-ad-format="fluid"
         data-ad-client="ca-pub-1110082069590452"
         data-ad-slot="5787819733"></ins>
    <script>
         (adsbygoogle = window.adsbygoogle || []).push({});
    </script>
  </div>

  <section class="special-funds-copy" aria-labelledby="howToUseSpecialFundsCalculator">
    <h2 id="howToUseSpecialFundsCalculator">How to use the calculator</h2>
    <ol>
      <li>Choose a Special Fund from the CMA Q2 2026 list.</li>
      <li>Enter your starting amount and any monthly contribution.</li>
      <li>Use the prefilled net annual return or replace it with the fund's latest published figure.</li>
      <li>Choose the investment period and calculate.</li>
    </ol>

    <p>The result shows your total contributions, estimated growth, projected final value and an approximate value in KES or USD where an exchange rate is available. Monthly contributions are added at the end of each month.</p>

    <h2>How the projection works</h2>
    <p>The calculator converts the annual return into an equivalent monthly rate, compounds the balance each month and then adds that month's contribution. It uses the net annual return entered in the form, so it does not subtract fees or Money Market Fund withholding tax again.</p>

    <p>Currency equivalents use the latest available exchange rate from the same free USD exchange-rate feed used by the main Kenya MMF Calculator. They are estimates and do not affect the fund projection.</p>

    <p>Special Fund returns change with the strategy and the markets it invests in. The projection shows what happens if the annual rate you entered continues; it is not a promised fund value.</p>

    <h2>What is included in the fund list?</h2>
    <p>The dataset contains all 42 Special Funds in the <a href="https://www.cmarcp.or.ke/images/Docs/cisreports/2026/CISReportQ2-2026.pdf">CMA Collective Investment Schemes Report for Q2 2026</a>. It also shows each fund's June 2026 assets under management, market share, strategy and currency.</p>

    <p>Read the full <a href="{{ '/blog/special-funds-in-kenya/' | relative_url }}">Special Funds in Kenya guide</a> for the market ranking, strategy differences and the comparison with Money Market Funds. For the largest fund family, see the <a href="{{ '/blog/mansa-x-special-fund-kenya/' | relative_url }}">Mansa-X guide</a>.</p>

    <h2>Quick answers</h2>

    <h3>Why is the return field editable?</h3>
    <p>Special Funds publish performance in different formats and on different dates. An editable field lets you use the newest net annual or annualised figure from the fund manager.</p>

    <h3>What if no rate appears after I select a fund?</h3>
    <p>Enter the latest comparable net annual return from the fund's fact sheet. The fund's CMA data will still appear above the form.</p>

    <h3>Can I compare this result with an MMF?</h3>
    <p>Yes. Run the same amount and period through the <a href="{{ '/' | relative_url }}">Kenya MMF Calculator</a>, then compare the final value together with access rules, currency and strategy.</p>
  </section>
</main>

<script src="{{ '/assets/js/special-funds-calculator.js' | relative_url }}" defer></script>
