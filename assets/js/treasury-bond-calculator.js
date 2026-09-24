(function (global) {
  'use strict';

  const DAY_MS = 86400000;
  const FREQ = 2;

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    const m = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function isoDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  function daysBetween(a, b) {
    return Math.round((b.getTime() - a.getTime()) / DAY_MS);
  }

  function addMonthsUTC(date, months) {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    const d = date.getUTCDate();
    const target = new Date(Date.UTC(y, m + months, 1));
    const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d, last));
    return target;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function finiteNumber(value, fallback = NaN) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatKES(value, digits = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  }

  function formatPct(value, digits = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `${n.toFixed(digits)}%`;
  }

  function couponSchedule(settlement, maturity, lastCouponOverride, nextCouponOverride) {
    if (!settlement || !maturity || maturity <= settlement) return null;

    const lastOverride = parseDate(lastCouponOverride);
    const nextOverride = parseDate(nextCouponOverride);
    if (lastOverride && nextOverride && lastOverride < settlement && nextOverride > settlement && nextOverride <= maturity) {
      const future = [];
      let d = nextOverride;
      let guard = 0;
      while (d <= maturity && guard < 200) {
        future.push(d);
        d = addMonthsUTC(d, 6);
        guard += 1;
      }
      if (!future.length || isoDate(future[future.length - 1]) !== isoDate(maturity)) {
        if (maturity > future[future.length - 1]) future.push(maturity);
      }
      return { lastCoupon: lastOverride, nextCoupon: nextOverride, futureDates: future };
    }

    let next = maturity;
    let prev = addMonthsUTC(next, -6);
    let guard = 0;
    while (prev > settlement && guard < 200) {
      next = prev;
      prev = addMonthsUTC(next, -6);
      guard += 1;
    }

    const future = [];
    let d = next;
    guard = 0;
    while (d <= maturity && guard < 200) {
      future.push(d);
      if (isoDate(d) === isoDate(maturity)) break;
      const candidate = addMonthsUTC(d, 6);
      d = candidate > maturity ? maturity : candidate;
      guard += 1;
    }

    return { lastCoupon: prev, nextCoupon: next, futureDates: future };
  }

  function priceBond(params) {
    const settlement = parseDate(params.settlementDate);
    const maturity = parseDate(params.maturityDate);
    const couponRate = Math.max(0, finiteNumber(params.couponRate, 0));
    const yieldPct = finiteNumber(params.yieldPct);
    const face = finiteNumber(params.faceValue, 100);
    const bondType = params.bondType || 'fixed';
    if (!settlement || !maturity || maturity <= settlement || !Number.isFinite(yieldPct) || face <= 0) {
      return null;
    }

    const schedule = couponSchedule(settlement, maturity, params.lastCouponDate, params.nextCouponDate);
    if (!schedule) return null;

    const couponPer100 = bondType === 'zero' ? 0 : couponRate / FREQ;
    const ratePerPeriod = yieldPct / 100 / FREQ;
    if (ratePerPeriod <= -0.999999) return null;

    const periodDays = Math.max(1, daysBetween(schedule.lastCoupon, schedule.nextCoupon));
    const daysToNext = Math.max(0, daysBetween(settlement, schedule.nextCoupon));
    const fractionToNext = clamp(daysToNext / periodDays, 0, 1);
    const elapsedFraction = clamp(1 - fractionToNext, 0, 1);
    const accruedPer100 = couponPer100 * elapsedFraction;

    let dirtyPer100 = 0;
    let weightedPVYears = 0;
    let convexityNumerator = 0;
    const flows = [];

    schedule.futureDates.forEach((date, idx) => {
      const tPeriods = fractionToNext + idx;
      const years = tPeriods / FREQ;
      const isMaturity = isoDate(date) === isoDate(maturity);
      const cashPer100 = couponPer100 + (isMaturity ? 100 : 0);
      const discount = Math.pow(1 + ratePerPeriod, tPeriods);
      const pv = cashPer100 / discount;
      dirtyPer100 += pv;
      weightedPVYears += years * pv;
      convexityNumerator += cashPer100 * tPeriods * (tPeriods + 1) / Math.pow(1 + ratePerPeriod, tPeriods + 2);
      flows.push({ date, tPeriods, years, cashPer100, pv, isMaturity });
    });

    const cleanPer100 = dirtyPer100 - accruedPer100;
    const macaulayYears = dirtyPer100 > 0 ? weightedPVYears / dirtyPer100 : NaN;
    const modifiedYears = macaulayYears / (1 + ratePerPeriod);
    const convexityYears2 = dirtyPer100 > 0 ? convexityNumerator / dirtyPer100 / (FREQ * FREQ) : NaN;

    return {
      faceValue: face,
      couponRate,
      yieldPct,
      settlement,
      maturity,
      schedule,
      couponPer100,
      accruedPer100,
      cleanPer100,
      dirtyPer100,
      macaulayYears,
      modifiedYears,
      convexityYears2,
      flows
    };
  }

  function xnpv(rate, cashflows) {
    if (rate <= -0.999999999 || !cashflows.length) return NaN;
    const t0 = cashflows[0].date;
    return cashflows.reduce((sum, cf) => {
      const years = daysBetween(t0, cf.date) / 365.2425;
      return sum + cf.amount / Math.pow(1 + rate, years);
    }, 0);
  }

  function xirr(cashflows) {
    const flows = cashflows
      .filter(cf => cf && cf.date instanceof Date && Number.isFinite(cf.amount))
      .sort((a, b) => a.date - b.date);
    if (flows.length < 2 || !flows.some(f => f.amount < 0) || !flows.some(f => f.amount > 0)) return NaN;

    let low = -0.9999;
    let high = 10;
    let fLow = xnpv(low, flows);
    let fHigh = xnpv(high, flows);
    let guard = 0;
    while (Number.isFinite(fLow) && Number.isFinite(fHigh) && fLow * fHigh > 0 && guard < 20) {
      high *= 2;
      fHigh = xnpv(high, flows);
      guard += 1;
    }
    if (!Number.isFinite(fLow) || !Number.isFinite(fHigh) || fLow * fHigh > 0) return NaN;

    for (let i = 0; i < 160; i += 1) {
      const mid = (low + high) / 2;
      const fMid = xnpv(mid, flows);
      if (!Number.isFinite(fMid)) return NaN;
      if (Math.abs(fMid) < 1e-8) return mid;
      if (fLow * fMid <= 0) {
        high = mid;
        fHigh = fMid;
      } else {
        low = mid;
        fLow = fMid;
      }
    }
    return (low + high) / 2;
  }

  function autoTaxRate(originalTenorYears, bondType) {
    if (bondType === 'infrastructure') return 0;
    const tenor = finiteNumber(originalTenorYears);
    if (!Number.isFinite(tenor) || tenor <= 0) return 15;
    return tenor >= 10 ? 10 : 15;
  }

  function purchaseAnalysis(params) {
    const basePrice = priceBond(params);
    if (!basePrice) return null;

    const face = basePrice.faceValue;
    const useMarketPrice = params.pricingMode === 'market-price';
    const enteredClean = finiteNumber(params.cleanPricePer100);
    const enteredDirty = finiteNumber(params.dirtyPricePer100);

    let cleanPer100 = basePrice.cleanPer100;
    let dirtyPer100 = basePrice.dirtyPer100;
    if (useMarketPrice && Number.isFinite(enteredClean) && enteredClean > 0) {
      cleanPer100 = enteredClean;
      dirtyPer100 = Number.isFinite(enteredDirty) && enteredDirty > 0
        ? enteredDirty
        : cleanPer100 + basePrice.accruedPer100;
    }

    const taxRate = clamp(finiteNumber(params.taxRate, 0), 0, 100) / 100;
    const transactionCosts = Math.max(0, finiteNumber(params.purchaseCosts, 0));
    const cleanAmount = face * cleanPer100 / 100;
    const dirtyAmount = face * dirtyPer100 / 100;
    const accruedAmount = face * basePrice.accruedPer100 / 100;
    const parDiscount = Math.max(0, face - cleanAmount);
    const discountTax = params.includeDiscountTax ? parDiscount * taxRate : 0;
    const totalPurchaseCost = dirtyAmount + discountTax + transactionCosts;

    const couponGross = params.bondType === 'zero' ? 0 : face * basePrice.couponRate / 100 / FREQ;
    const couponTax = couponGross * taxRate;
    const couponNet = couponGross - couponTax;

    const cashflowRows = [];
    const grossFlows = [{ date: basePrice.settlement, amount: -totalPurchaseCost }];
    const netFlows = [{ date: basePrice.settlement, amount: -totalPurchaseCost }];
    let totalGrossCoupons = 0;
    let totalCouponTax = 0;
    let totalNetCoupons = 0;

    basePrice.schedule.futureDates.forEach(date => {
      const isMaturity = isoDate(date) === isoDate(basePrice.maturity);
      const grossCoupon = couponGross;
      const tax = couponTax;
      const netCoupon = couponNet;
      const principal = isMaturity ? face : 0;
      const grossTotal = grossCoupon + principal;
      const netTotal = netCoupon + principal;
      totalGrossCoupons += grossCoupon;
      totalCouponTax += tax;
      totalNetCoupons += netCoupon;
      cashflowRows.push({ date, grossCoupon, tax, netCoupon, principal, netTotal });
      grossFlows.push({ date, amount: grossTotal });
      netFlows.push({ date, amount: netTotal });
    });

    const grossIrr = xirr(grossFlows);
    const afterTaxIrr = xirr(netFlows);
    const totalTax = totalCouponTax + discountTax;
    const totalCashReceived = totalNetCoupons + face;
    const netProfit = totalCashReceived - totalPurchaseCost;
    const holdingReturnPct = totalPurchaseCost > 0 ? netProfit / totalPurchaseCost * 100 : NaN;
    const currentYieldPct = cleanAmount > 0 ? (couponGross * FREQ) / cleanAmount * 100 : NaN;

    return {
      ...basePrice,
      cleanPer100,
      dirtyPer100,
      cleanAmount,
      dirtyAmount,
      accruedAmount,
      taxRatePct: taxRate * 100,
      discountTax,
      transactionCosts,
      totalPurchaseCost,
      couponGross,
      couponTax,
      couponNet,
      totalGrossCoupons,
      totalCouponTax,
      totalNetCoupons,
      totalTax,
      totalCashReceived,
      netProfit,
      holdingReturnPct,
      currentYieldPct,
      grossIrrPct: Number.isFinite(grossIrr) ? grossIrr * 100 : NaN,
      afterTaxIrrPct: Number.isFinite(afterTaxIrr) ? afterTaxIrr * 100 : NaN,
      cashflowRows
    };
  }

  function saleAnalysis(purchase, params) {
    if (!purchase) return null;
    const saleDate = parseDate(params.saleDate);
    const saleYield = finiteNumber(params.saleYieldPct);
    if (!saleDate || saleDate <= purchase.settlement || saleDate >= purchase.maturity || !Number.isFinite(saleYield)) return null;

    const exitPrice = priceBond({
      faceValue: purchase.faceValue,
      couponRate: purchase.couponRate,
      yieldPct: saleYield,
      settlementDate: isoDate(saleDate),
      maturityDate: isoDate(purchase.maturity),
      bondType: params.bondType,
      lastCouponDate: '',
      nextCouponDate: ''
    });
    if (!exitPrice) return null;

    const face = purchase.faceValue;
    const saleCosts = Math.max(0, finiteNumber(params.saleCosts, 0));
    const taxRate = purchase.taxRatePct / 100;
    const couponsReceived = purchase.cashflowRows.filter(r => r.date <= saleDate && !r.principal);
    const grossCoupons = couponsReceived.reduce((s, r) => s + r.grossCoupon, 0);
    const couponTax = couponsReceived.reduce((s, r) => s + r.tax, 0);
    const netCoupons = couponsReceived.reduce((s, r) => s + r.netCoupon, 0);

    const grossSaleProceeds = face * exitPrice.dirtyPer100 / 100;
    const saleAccruedInterest = face * exitPrice.accruedPer100 / 100;
    const accruedInterestTax = saleAccruedInterest * taxRate;
    const netSaleProceeds = grossSaleProceeds - accruedInterestTax - saleCosts;
    const totalNetReceived = netCoupons + netSaleProceeds;
    const profit = totalNetReceived - purchase.totalPurchaseCost;
    const hpr = purchase.totalPurchaseCost > 0 ? profit / purchase.totalPurchaseCost : NaN;
    const years = daysBetween(purchase.settlement, saleDate) / 365.2425;
    const annualised = Number.isFinite(hpr) && years > 0 && 1 + hpr > 0 ? Math.pow(1 + hpr, 1 / years) - 1 : NaN;

    return {
      saleDate,
      saleYield,
      cleanPer100: exitPrice.cleanPer100,
      dirtyPer100: exitPrice.dirtyPer100,
      grossCoupons,
      couponTax,
      netCoupons,
      saleAccruedInterest,
      accruedInterestTax,
      grossSaleProceeds,
      saleCosts,
      netSaleProceeds,
      totalNetReceived,
      profit,
      holdingReturnPct: Number.isFinite(hpr) ? hpr * 100 : NaN,
      annualisedReturnPct: Number.isFinite(annualised) ? annualised * 100 : NaN
    };
  }

  function scenarioRows(params, shifts) {
    const baseYield = finiteNumber(params.yieldPct);
    if (!Number.isFinite(baseYield)) return [];
    return shifts.map(shift => {
      const y = Math.max(-1.99, baseYield + shift);
      const p = priceBond({ ...params, yieldPct: y });
      return p ? { shift, yieldPct: y, cleanPer100: p.cleanPer100, dirtyPer100: p.dirtyPer100 } : null;
    }).filter(Boolean);
  }

  const MathAPI = {
    parseDate,
    isoDate,
    daysBetween,
    addMonthsUTC,
    couponSchedule,
    priceBond,
    xirr,
    autoTaxRate,
    purchaseAnalysis,
    saleAnalysis,
    scenarioRows,
    formatKES,
    formatPct
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MathAPI;
  global.TreasuryBondCalculatorMath = MathAPI;

  if (typeof document === 'undefined') return;

  const root = document.getElementById('treasuryBondCalculator');
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const form = $('treasuryBondForm');
  const result = $('treasuryBondResults');
  const errorBox = $('treasuryBondError');
  const dataStatus = $('treasuryBondDataStatus');
  const marketSelect = $('treasuryBondMarketBond');
  const manualFields = $('treasuryBondManualFields');
  const saleFields = $('treasuryBondSaleFields');
  const saleToggle = $('treasuryBondEnableSale');
  const taxMode = $('treasuryBondTaxMode');
  const customTaxWrap = $('treasuryBondCustomTaxWrap');
  const pricingMode = $('treasuryBondPricingMode');
  const latestPriceNote = $('treasuryBondLatestPriceNote');
  let bondRows = [];
  let benchmark = null;

  function csvParse(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '"') {
        if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        row.push(cell); cell = '';
      } else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && text[i + 1] === '\n') i += 1;
        row.push(cell); cell = '';
        if (row.some(v => v !== '')) rows.push(row);
        row = [];
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(cols => Object.fromEntries(headers.map((h, i) => [h, (cols[i] || '').trim()])));
  }

  async function loadCsv(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not load ${url}`);
    return csvParse(await res.text());
  }

  function selectValue(id, value) {
    const el = $(id);
    if (el && [...el.options].some(o => o.value === String(value))) el.value = String(value);
  }

  function applyBond(row) {
    if (!row) return;
    $('treasuryBondType').value = row.bond_type === 'infrastructure' ? 'infrastructure' : 'fixed';
    $('treasuryBondOriginalTenor').value = row.original_tenor_years || '';
    $('treasuryBondCouponRate').value = row.coupon_rate || '';
    $('treasuryBondYield').value = row.market_yield || '';
    $('treasuryBondMaturity').value = row.maturity_date || '';
    $('treasuryBondCleanPrice').value = row.clean_price || '';
    $('treasuryBondDirtyPrice').value = row.dirty_price || '';
    pricingMode.value = row.clean_price ? 'market-price' : 'yield';
    latestPriceNote.textContent = row.nse_date
      ? `Latest NSE trade data: ${row.nse_date}. Price fields remain editable.`
      : '';
    latestPriceNote.hidden = !latestPriceNote.textContent;
    selectValue('treasuryBondTaxMode', 'auto');
    syncTaxMode();
  }

  function populateBonds() {
    marketSelect.innerHTML = '<option value="manual">Manual entry</option>';
    bondRows.forEach((row, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      const yieldLabel = row.market_yield ? ` · ${Number(row.market_yield).toFixed(3)}% YTM` : '';
      opt.textContent = `${row.issue_code}${yieldLabel}`;
      marketSelect.appendChild(opt);
    });
    marketSelect.disabled = false;
  }

  async function loadData() {
    try {
      const [bonds, bench] = await Promise.all([
        loadCsv(root.dataset.bondsUrl),
        loadCsv(root.dataset.benchmarkUrl)
      ]);
      bondRows = bonds.filter(r => r.issue_code && r.maturity_date);
      benchmark = bench[0] || null;
      populateBonds();
      if (benchmark && benchmark.Yield) {
        $('treasuryBondBenchmark').textContent = `${Number(benchmark.Yield).toFixed(2)}%`;
        $('treasuryBondBenchmarkDate').textContent = benchmark.Date || '';
      }
      dataStatus.textContent = bondRows.length
        ? `${bondRows.length} NSE-traded bonds loaded`
        : 'Manual mode available';
    } catch (err) {
      console.error(err);
      marketSelect.innerHTML = '<option value="manual">Manual entry</option>';
      marketSelect.disabled = false;
      dataStatus.textContent = 'Live bond list unavailable — manual mode works';
    }
  }

  function syncMode() {
    const manual = marketSelect.value === 'manual';
    manualFields.hidden = false;
    if (!manual) applyBond(bondRows[Number(marketSelect.value)]);
    latestPriceNote.hidden = manual || !latestPriceNote.textContent;
  }

  function syncTaxMode() {
    customTaxWrap.hidden = taxMode.value !== 'custom';
  }

  function syncSale() {
    saleFields.hidden = !saleToggle.checked;
  }

  function getTaxRate() {
    if (taxMode.value === 'custom') return finiteNumber($('treasuryBondCustomTax').value, 0);
    if (taxMode.value === 'zero') return 0;
    if (taxMode.value === '10') return 10;
    if (taxMode.value === '15') return 15;
    return autoTaxRate($('treasuryBondOriginalTenor').value, $('treasuryBondType').value);
  }

  function readParams() {
    return {
      bondType: $('treasuryBondType').value,
      faceValue: finiteNumber($('treasuryBondFaceValue').value),
      couponRate: finiteNumber($('treasuryBondCouponRate').value, 0),
      yieldPct: finiteNumber($('treasuryBondYield').value),
      settlementDate: $('treasuryBondSettlement').value,
      maturityDate: $('treasuryBondMaturity').value,
      originalTenorYears: finiteNumber($('treasuryBondOriginalTenor').value),
      lastCouponDate: $('treasuryBondLastCoupon').value,
      nextCouponDate: $('treasuryBondNextCoupon').value,
      pricingMode: pricingMode.value,
      cleanPricePer100: finiteNumber($('treasuryBondCleanPrice').value),
      dirtyPricePer100: finiteNumber($('treasuryBondDirtyPrice').value),
      taxRate: getTaxRate(),
      includeDiscountTax: $('treasuryBondDiscountTax').checked,
      purchaseCosts: finiteNumber($('treasuryBondPurchaseCosts').value, 0),
      saleDate: $('treasuryBondSaleDate').value,
      saleYieldPct: finiteNumber($('treasuryBondSaleYield').value),
      saleCosts: finiteNumber($('treasuryBondSaleCosts').value, 0)
    };
  }

  function validate(p) {
    const errors = [];
    if (!(p.faceValue > 0)) errors.push('Enter a face value greater than zero.');
    if (!p.settlementDate) errors.push('Choose a settlement or purchase date.');
    if (!p.maturityDate) errors.push('Choose a maturity date.');
    const sd = parseDate(p.settlementDate);
    const md = parseDate(p.maturityDate);
    if (sd && md && md <= sd) errors.push('Maturity date must be after the settlement date.');
    if (!Number.isFinite(p.yieldPct) || p.yieldPct <= -1.99 || p.yieldPct > 100) errors.push('Enter a valid market yield.');
    if (p.bondType !== 'zero' && (!Number.isFinite(p.couponRate) || p.couponRate < 0 || p.couponRate > 100)) errors.push('Enter a valid coupon rate.');
    if (pricingMode.value === 'market-price' && !(p.cleanPricePer100 > 0)) errors.push('Enter a clean price per KSh100 or switch pricing mode to Calculate from yield.');
    if (saleToggle.checked && !p.saleDate) errors.push('Choose a planned sale date.');
    if (saleToggle.checked && !Number.isFinite(p.saleYieldPct)) errors.push('Enter the expected market yield at sale.');
    return errors;
  }

  function resultItem(label, value, strong) {
    return `<div class="treasury-bond-results__item${strong ? ' treasury-bond-results__item--strong' : ''}"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function renderCashflows(rows) {
    if (!rows.length) return '<p>No future cash flows.</p>';
    const body = rows.map(r => `<tr><td>${isoDate(r.date)}</td><td>${formatKES(r.grossCoupon)}</td><td>${formatKES(r.tax)}</td><td>${formatKES(r.netCoupon)}</td><td>${formatKES(r.principal)}</td><td>${formatKES(r.netTotal)}</td></tr>`).join('');
    return `<div class="treasury-bond-table-wrap"><table class="treasury-bond-table"><thead><tr><th>Date</th><th>Gross coupon</th><th>Tax</th><th>Net coupon</th><th>Principal</th><th>Net cash</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function renderScenarios(p, purchase) {
    const rows = scenarioRows(p, [-2, -1, -0.5, 0, 0.5, 1, 2]);
    const base = purchase.cleanPer100;
    const body = rows.map(r => {
      const change = base ? (r.cleanPer100 / base - 1) * 100 : NaN;
      const label = r.shift === 0 ? 'Current' : `${r.shift > 0 ? '+' : ''}${r.shift.toFixed(1)} pp`;
      return `<tr><td>${label}</td><td>${formatPct(r.yieldPct, 2)}</td><td>${r.cleanPer100.toFixed(4)}</td><td>${formatPct(change, 2)}</td></tr>`;
    }).join('');
    return `<div class="treasury-bond-table-wrap"><table class="treasury-bond-table"><thead><tr><th>Yield move</th><th>Market yield</th><th>Est. clean price / 100</th><th>Price change</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function render(p, purchase, sale) {
    const sourceRow = marketSelect.value !== 'manual' ? bondRows[Number(marketSelect.value)] : null;
    const sourceLink = sourceRow && sourceRow.source_url
      ? `<a href="${sourceRow.source_url}" target="_blank" rel="noopener">NSE source PDF</a>`
      : '';

    result.innerHTML = `
      <section class="treasury-bond-results__section">
        <div class="treasury-bond-results__section-heading"><h3>What you pay</h3>${sourceLink}</div>
        <div class="treasury-bond-results__grid">
          ${resultItem('Face value', formatKES(purchase.faceValue))}
          ${resultItem('Clean price / KSh100', purchase.cleanPer100.toFixed(4))}
          ${resultItem('Accrued interest', formatKES(purchase.accruedAmount))}
          ${resultItem('Dirty settlement amount', formatKES(purchase.dirtyAmount))}
          ${resultItem(`Discount WHT (${formatPct(purchase.taxRatePct, 0)})`, formatKES(purchase.discountTax))}
          ${resultItem('Purchase costs', formatKES(purchase.transactionCosts))}
          ${resultItem('Total cash required', formatKES(purchase.totalPurchaseCost), true)}
        </div>
      </section>

      <section class="treasury-bond-results__section">
        <h3>Income and tax</h3>
        <div class="treasury-bond-results__grid">
          ${resultItem('Gross coupon every 6 months', formatKES(purchase.couponGross))}
          ${resultItem('Tax per coupon', formatKES(purchase.couponTax))}
          ${resultItem('Net coupon every 6 months', formatKES(purchase.couponNet), true)}
          ${resultItem('Total gross coupons', formatKES(purchase.totalGrossCoupons))}
          ${resultItem('Total coupon tax', formatKES(purchase.totalCouponTax))}
          ${resultItem('Total tax incl. discount WHT', formatKES(purchase.totalTax))}
        </div>
      </section>

      <section class="treasury-bond-results__section">
        <h3>If you hold to maturity</h3>
        <div class="treasury-bond-results__grid">
          ${resultItem('Principal repaid', formatKES(purchase.faceValue))}
          ${resultItem('Total net cash received', formatKES(purchase.totalCashReceived))}
          ${resultItem('Net profit after tax and costs', formatKES(purchase.netProfit), true)}
          ${resultItem('Current yield', formatPct(purchase.currentYieldPct))}
          ${resultItem('Gross annualised IRR', formatPct(purchase.grossIrrPct))}
          ${resultItem('After-tax annualised IRR', formatPct(purchase.afterTaxIrrPct), true)}
          ${resultItem('Total holding return', formatPct(purchase.holdingReturnPct))}
        </div>
      </section>

      <section class="treasury-bond-results__section">
        <h3>Interest-rate risk</h3>
        <div class="treasury-bond-results__grid">
          ${resultItem('Macaulay duration', `${purchase.macaulayYears.toFixed(2)} years`)}
          ${resultItem('Modified duration', `${purchase.modifiedYears.toFixed(2)} years`)}
          ${resultItem('Convexity', `${purchase.convexityYears2.toFixed(2)} years²`)}
        </div>
        ${renderScenarios(p, purchase)}
      </section>

      ${sale ? `<section class="treasury-bond-results__section"><h3>If you sell on ${isoDate(sale.saleDate)}</h3><div class="treasury-bond-results__grid">
        ${resultItem('Expected sale yield', formatPct(sale.saleYield))}
        ${resultItem('Estimated clean sale price / 100', sale.cleanPer100.toFixed(4))}
        ${resultItem('Gross sale proceeds', formatKES(sale.grossSaleProceeds))}
        ${resultItem('Tax on accrued interest at sale', formatKES(sale.accruedInterestTax))}
        ${resultItem('Sale costs', formatKES(sale.saleCosts))}
        ${resultItem('Net coupons received before sale', formatKES(sale.netCoupons))}
        ${resultItem('Net sale proceeds', formatKES(sale.netSaleProceeds))}
        ${resultItem('Profit / loss after tax and costs', formatKES(sale.profit), true)}
        ${resultItem('Holding-period return', formatPct(sale.holdingReturnPct))}
        ${resultItem('Annualised holding-period return', formatPct(sale.annualisedReturnPct), true)}
      </div><p class="treasury-bond-results__note">The sale calculation does not apply capital gains tax to the bond price gain. KRA lists gains on securities traded on a CMA-licensed securities exchange among CGT exemptions. Coupon and accrued-interest tax are still included.</p></section>` : ''}

      <section class="treasury-bond-results__section">
        <h3>Cash-flow schedule</h3>
        ${renderCashflows(purchase.cashflowRows)}
      </section>
    `;
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    errorBox.hidden = true;
    errorBox.textContent = '';
    const p = readParams();
    const errors = validate(p);
    if (errors.length) {
      errorBox.textContent = errors.join(' ');
      errorBox.hidden = false;
      result.hidden = true;
      return;
    }

    const purchase = purchaseAnalysis(p);
    if (!purchase) {
      errorBox.textContent = 'The calculator could not price this bond. Check the dates, coupon and yield.';
      errorBox.hidden = false;
      result.hidden = true;
      return;
    }
    const sale = saleToggle.checked ? saleAnalysis(purchase, p) : null;
    render(p, purchase, sale);
  });

  marketSelect.addEventListener('change', syncMode);
  taxMode.addEventListener('change', syncTaxMode);
  saleToggle.addEventListener('change', syncSale);
  $('treasuryBondType').addEventListener('change', function () {
    if (taxMode.value === 'auto') syncTaxMode();
  });
  $('treasuryBondRoute').addEventListener('change', function () {
    $('treasuryBondDiscountTax').checked = this.value === 'primary';
  });

  const today = new Date();
  $('treasuryBondSettlement').value = isoDate(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  syncTaxMode();
  syncSale();
  loadData();
})(typeof window !== 'undefined' ? window : globalThis);
