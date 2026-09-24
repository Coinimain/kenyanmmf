---
layout: default
title: "Kenya Treasury Bond Calculator"
seo_title: "Kenya Treasury Bond Calculator: Price, Tax, YTM & Returns"
description: "Calculate Kenya Treasury bond price, accrued interest, withholding tax, coupons, after-tax returns, YTM, duration, convexity and early-sale outcomes."
permalink: /calculators/treasury-bond-calculator/
last_modified_at: "2026-09-24"
---

<link rel="stylesheet" href="{{ '/assets/css/treasury-bond-calculator.css' | relative_url }}">

<main class="treasury-bond-page">
  <nav class="treasury-bond-page__nav" aria-label="Treasury Bond Calculator navigation">
    <a href="{{ '/calculators/' | relative_url }}">All calculators</a>
    <span aria-hidden="true">|</span>
    <a href="{{ '/blog/kenya-government-bonds-treasury-bonds-guide/' | relative_url }}">Treasury bonds guide</a>
  </nav>

  <header class="treasury-bond-hero">
    <p class="treasury-bond-hero__eyebrow">Free Kenya investment calculator</p>
    <h1>Kenya Treasury Bond Calculator</h1>
    <p>Calculate what a Treasury bond costs, what it pays after withholding tax, its yield to maturity, full coupon cash flow, interest-rate risk and the result of selling before maturity.</p>
    <a class="treasury-bond-hero__button" href="#treasuryBondCalculator">Calculate a bond</a>

    <div class="treasury-bond-benchmark" aria-label="Current Kenya 10-year bond benchmark">
      <span>Latest NSE-derived Kenya 10-year benchmark</span>
      <strong id="treasuryBondBenchmark">Loading…</strong>
      <span id="treasuryBondBenchmarkDate"></span>
    </div>
  </header>

  <section
    id="treasuryBondCalculator"
    class="treasury-bond-calculator"
    data-bonds-url="{{ '/kenya-bonds-data.csv' | relative_url }}"
    data-benchmark-url="{{ '/kenya-10y-bond-data.csv' | relative_url }}"
    aria-labelledby="treasuryBondCalculatorHeading"
  >
    <div class="treasury-bond-calculator__heading">
      <div>
        <p class="treasury-bond-calculator__kicker">Bond pricing and returns</p>
        <h2 id="treasuryBondCalculatorHeading">Enter the bond details</h2>
      </div>
      <span id="treasuryBondDataStatus" class="treasury-bond-calculator__data-status">Loading NSE bond data…</span>
    </div>

    <form id="treasuryBondForm" class="treasury-bond-calculator__form" novalidate>
      <fieldset class="treasury-bond-calculator__section">
        <legend>1. Choose a bond</legend>
        <div class="treasury-bond-calculator__grid">
          <div class="treasury-bond-calculator__field treasury-bond-calculator__field--wide">
            <label for="treasuryBondMarketBond">NSE bond or manual entry</label>
            <select id="treasuryBondMarketBond" disabled>
              <option value="manual">Loading bond list…</option>
            </select>
            <p class="treasury-bond-calculator__help">The market list contains bonds with a usable traded yield and price in the latest NSE bond-price file. Choose Manual entry for another issue.</p>
          </div>
        </div>
      </fieldset>

      <fieldset id="treasuryBondManualFields" class="treasury-bond-calculator__section">
        <legend>2. Bond and purchase details</legend>
        <div class="treasury-bond-calculator__grid">
          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondType">Bond type</label>
            <select id="treasuryBondType">
              <option value="fixed">Conventional fixed-coupon bond</option>
              <option value="infrastructure">Infrastructure bond</option>
              <option value="zero">Zero-coupon bond</option>
              <option value="floating">Floating-rate bond — projected coupon</option>
            </select>
          </div>

          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondRoute">Purchase route</label>
            <select id="treasuryBondRoute">
              <option value="secondary">Secondary market</option>
              <option value="primary">Primary issue or reopening</option>
            </select>
          </div>

          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondFaceValue">Face value (KSh)</label>
            <input id="treasuryBondFaceValue" type="number" min="1" step="0.01" inputmode="decimal" value="100000" required>
            <p class="treasury-bond-calculator__help">The principal amount repaid at maturity for a standard bullet bond.</p>
          </div>

          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondOriginalTenor">Original tenor (years)</label>
            <input id="treasuryBondOriginalTenor" type="number" min="0.1" max="100" step="0.1" inputmode="decimal" value="10">
            <p class="treasury-bond-calculator__help">Used for automatic conventional-bond withholding tax. Use the original tenor, not years remaining.</p>
          </div>

          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondCouponRate">Annual coupon rate (%)</label>
            <input id="treasuryBondCouponRate" type="number" min="0" max="100" step="0.0001" inputmode="decimal" value="13">
          </div>

          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondYield">Market / quoted yield (%)</label>
            <input id="treasuryBondYield" type="number" min="-1.99" max="100" step="0.0001" inputmode="decimal" value="13" required>
          </div>

          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondSettlement">Settlement / purchase date</label>
            <input id="treasuryBondSettlement" type="date" required>
          </div>

          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondMaturity">Maturity date</label>
            <input id="treasuryBondMaturity" type="date" required>
          </div>

          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondLastCoupon">Last coupon date — optional</label>
            <input id="treasuryBondLastCoupon" type="date">
          </div>

          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondNextCoupon">Next coupon date — optional</label>
            <input id="treasuryBondNextCoupon" type="date">
          </div>
        </div>
        <p class="treasury-bond-calculator__note">If coupon dates are blank, the calculator builds a six-month schedule backwards from the maturity date. Enter the prospectus coupon dates when you need the exact CBK schedule.</p>
      </fieldset>

      <fieldset class="treasury-bond-calculator__section">
        <legend>3. Price and transaction costs</legend>
        <div class="treasury-bond-calculator__grid">
          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondPricingMode">Purchase price source</label>
            <select id="treasuryBondPricingMode">
              <option value="yield">Calculate price from yield</option>
              <option value="market-price">Use entered / latest NSE price</option>
            </select>
          </div>

          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondPurchaseCosts">Purchase costs (KSh)</label>
            <input id="treasuryBondPurchaseCosts" type="number" min="0" step="0.01" inputmode="decimal" value="0">
          </div>

          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondCleanPrice">Clean price per KSh100</label>
            <input id="treasuryBondCleanPrice" type="number" min="0.0001" step="0.0001" inputmode="decimal" placeholder="e.g. 98.4500">
          </div>

          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondDirtyPrice">Dirty price per KSh100 — optional</label>
            <input id="treasuryBondDirtyPrice" type="number" min="0.0001" step="0.0001" inputmode="decimal" placeholder="Uses clean price + accrued interest if blank">
          </div>
        </div>
        <p id="treasuryBondLatestPriceNote" class="treasury-bond-calculator__note" hidden></p>
      </fieldset>

      <fieldset class="treasury-bond-calculator__section">
        <legend>4. Tax</legend>
        <div class="treasury-bond-calculator__grid">
          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondTaxMode">Withholding-tax treatment</label>
            <select id="treasuryBondTaxMode">
              <option value="auto">Automatic from bond type and original tenor</option>
              <option value="15">15%</option>
              <option value="10">10%</option>
              <option value="zero">0% / tax exempt</option>
              <option value="custom">Custom rate</option>
            </select>
          </div>

          <div id="treasuryBondCustomTaxWrap" class="treasury-bond-calculator__field" hidden>
            <label for="treasuryBondCustomTax">Custom tax rate (%)</label>
            <input id="treasuryBondCustomTax" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="10">
          </div>

          <div class="treasury-bond-calculator__field treasury-bond-calculator__field--wide">
            <label class="treasury-bond-calculator__checkbox" for="treasuryBondDiscountTax">
              <input id="treasuryBondDiscountTax" type="checkbox">
              <span>Include estimated withholding tax on a discount below par in the purchase cash required.</span>
            </label>
            <p class="treasury-bond-calculator__help">This is switched on automatically for primary issues/reopenings and off for secondary-market purchases. You can override it to match the transaction documents.</p>
          </div>
        </div>
      </fieldset>

      <fieldset class="treasury-bond-calculator__section">
        <legend>5. Optional early-sale scenario</legend>
        <label class="treasury-bond-calculator__checkbox" for="treasuryBondEnableSale">
          <input id="treasuryBondEnableSale" type="checkbox">
          <span>Calculate what happens if I sell before maturity.</span>
        </label>
        <div id="treasuryBondSaleFields" class="treasury-bond-calculator__grid" hidden style="margin-top:16px">
          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondSaleDate">Planned sale date</label>
            <input id="treasuryBondSaleDate" type="date">
          </div>
          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondSaleYield">Expected market yield at sale (%)</label>
            <input id="treasuryBondSaleYield" type="number" min="-1.99" max="100" step="0.0001" inputmode="decimal">
          </div>
          <div class="treasury-bond-calculator__field">
            <label for="treasuryBondSaleCosts">Sale costs (KSh)</label>
            <input id="treasuryBondSaleCosts" type="number" min="0" step="0.01" inputmode="decimal" value="0">
          </div>
        </div>
      </fieldset>

      <div id="treasuryBondError" class="treasury-bond-calculator__error" role="alert" hidden></div>
      <div class="treasury-bond-calculator__actions">
        <button class="treasury-bond-calculator__button" type="submit">Calculate bond returns</button>
      </div>
    </form>
  </section>

<section id="treasuryBondResults" class="treasury-bond-results" aria-live="polite" hidden></section>

<div class="treasury-bond-page__ad" aria-label="Advertisement">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1110082069590452"
       crossorigin="anonymous"></script>
  <!-- Treasury Bond Calculator - Below Calculator - Display -->
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="ca-pub-1110082069590452"
       data-ad-slot="5847616178"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
       (adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>

<section class="treasury-bond-copy">
    <h2>What this Treasury bond calculator includes</h2>
    <p>This tool combines bond pricing, accrued interest, tax, income and risk calculations in one place. It can calculate from a quoted yield or use the latest usable clean and dirty prices extracted from the Nairobi Securities Exchange bond-price file.</p>

    <div class="treasury-bond-copy__callout">
      <strong>Tax treatment:</strong> the automatic setting uses 15% withholding tax for conventional Treasury bonds with an original tenor of up to nine years, 10% for conventional bonds with an original tenor of 10 years or more, and 0% for infrastructure bonds. Change the setting when the prospectus or your tax status requires a different treatment.
    </div>

    <h2>How clean price, dirty price and accrued interest work</h2>
    <p>The clean price excludes accrued coupon interest. The dirty price includes it and is the amount used to estimate settlement value. For a purchase between coupon dates, the calculator works out the accrued portion from the last and next coupon dates. If those dates are not supplied, it creates a standard semiannual schedule from maturity.</p>

    <h2>What the return figures mean</h2>
    <ul>
      <li><strong>Current yield</strong> compares the annual coupon with the clean purchase value.</li>
      <li><strong>Gross annualised IRR</strong> uses the purchase cash outflow and the full future gross cash-flow schedule.</li>
      <li><strong>After-tax annualised IRR</strong> uses the actual purchase cash required, net coupons after withholding tax and principal repayment.</li>
      <li><strong>Modified duration</strong> estimates price sensitivity to a small change in yield.</li>
      <li><strong>Convexity</strong> improves the picture for larger yield changes.</li>
    </ul>

    <h2>Early sale and capital gains</h2>
    <p>The early-sale section reprices the remaining bond cash flows at the expected sale yield, includes accrued interest, subtracts sale costs and calculates the holding-period return. It does not apply capital gains tax to the bond price gain because KRA lists gains on securities traded on a CMA-licensed securities exchange among CGT exemptions. The calculator still applies the selected withholding-tax rate to coupon income and estimated accrued interest received at sale.</p>

    <h2>Data source and limitations</h2>
    <p>The selectable bond list is generated from the NSE bond-price PDF used by this site's automated Kenya 10-year benchmark. Only rows with a usable current trade yield and price are added automatically. Manual mode remains available for a bond that did not trade in the source file, a new issue or a bond with special cash-flow terms.</p>

    <p>For amortising or unusually structured bonds, enter the bond's official prospectus dates and verify the result against the Central Bank's final pricing. The CBK states that its own calculators are guides and final pricing is determined by the Bank.</p>

    <p>Read the <a href="{{ '/blog/kenya-government-bonds-treasury-bonds-guide/' | relative_url }}">Kenya Treasury bonds guide</a> for DhowCSD bidding, auction, settlement and bond terminology.</p>
  </section>
</main>

<script src="{{ '/assets/js/treasury-bond-calculator.js' | relative_url }}" defer></script>
