(function () {
  "use strict";

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      const next = text[index + 1];

      if (character === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (character === "," && !inQuotes) {
        row.push(field);
        field = "";
      } else if ((character === "\n" || character === "\r") && !inQuotes) {
        if (character === "\r" && next === "\n") {
          index += 1;
        }
        row.push(field);
        if (row.some(function (value) { return value.trim() !== ""; })) {
          rows.push(row);
        }
        row = [];
        field = "";
      } else {
        field += character;
      }
    }

    row.push(field);
    if (row.some(function (value) { return value.trim() !== ""; })) {
      rows.push(row);
    }

    if (rows.length === 0) {
      return [];
    }

    const headers = rows[0].map(function (header, index) {
      return (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim();
    });

    return rows.slice(1).map(function (values) {
      return headers.reduce(function (record, header, index) {
        record[header] = (values[index] || "").trim();
        return record;
      }, {});
    });
  }

  function toNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
      return null;
    }

    const number = Number(String(value).replace(/[,%\s]/g, ""));
    return Number.isFinite(number) ? number : null;
  }

  function projectValue(initial, monthly, annualRate, months) {
    const annualFactor = 1 + (annualRate / 100);

    if (annualFactor <= 0) {
      throw new RangeError("The annual return must be greater than -100%.");
    }

    const monthlyRate = Math.pow(annualFactor, 1 / 12) - 1;
    let balance = initial;

    for (let month = 0; month < months; month += 1) {
      balance = (balance * (1 + monthlyRate)) + monthly;
    }

    return {
      finalValue: balance,
      totalContributions: initial + (monthly * months),
      estimatedGrowth: balance - initial - (monthly * months),
      monthlyRate: monthlyRate
    };
  }

  function latestBondObservation(rows) {
    let latest = null;

    rows.forEach(function (row) {
      const date = String(row.Date || "").trim();
      const yieldPercent = toNumber(row.Yield || row.Close);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || yieldPercent === null || yieldPercent <= 0 || yieldPercent >= 100) {
        return;
      }

      const timestamp = Date.parse(date + "T00:00:00Z");
      if (!Number.isFinite(timestamp)) {
        return;
      }

      if (!latest || timestamp > latest.timestamp) {
        latest = {
          date: date,
          yield: yieldPercent,
          timestamp: timestamp
        };
      }
    });

    return latest;
  }

  function spearheadTargetRate(yieldPercent) {
    if (!Number.isFinite(yieldPercent) || yieldPercent <= 0 || yieldPercent >= 100) {
      return null;
    }

    return Number((yieldPercent + 3).toFixed(3));
  }

  function convertFinalValue(value, sourceCurrency, rates) {
    const currency = String(sourceCurrency || "").toUpperCase();
    const usdKes = toNumber(rates && rates.KES);

    if (!Number.isFinite(value) || usdKes === null || usdKes <= 0) {
      return null;
    }

    if (currency === "KES") {
      return { currency: "USD", value: value / usdKes };
    }

    if (currency === "USD") {
      return { currency: "KES", value: value * usdKes };
    }

    const sourcePerUsd = toNumber(rates && rates[currency]);
    if (sourcePerUsd === null || sourcePerUsd <= 0) {
      return null;
    }

    return { currency: "KES", value: (value / sourcePerUsd) * usdKes };
  }

  const exported = {
    convertFinalValue: convertFinalValue,
    latestBondObservation: latestBondObservation,
    parseCsv: parseCsv,
    projectValue: projectValue,
    spearheadTargetRate: spearheadTargetRate,
    toNumber: toNumber
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (typeof document === "undefined") {
    return;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatNumber(value, decimals) {
    return new Intl.NumberFormat("en-KE", {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals || 0
    }).format(value);
  }

  function formatMoney(value, currency, decimals) {
    const prefixes = {
      KES: "KSh",
      USD: "US$",
      GBP: "£",
      EUR: "€"
    };
    const prefix = prefixes[currency] || currency;
    const sign = value < 0 ? "-" : "";
    const fractionDigits = decimals === undefined ? 0 : decimals;
    return sign + prefix + " " + formatNumber(Math.abs(value), fractionDigits);
  }

  const FX_API = "https://open.er-api.com/v6/latest/USD";
  const FX_CACHE_KEY = "special_funds_fx_rates_v1";
  const SHARED_FX_CACHE_KEY = "usd_kes_rate_v1";
  const FX_CACHE_TTL = 12 * 60 * 60 * 1000;
  const SPEARHEAD_FUND_ID = "spearhead-africa-infrastructure";
  let fxRates = { USD: 1, KES: 129 };

  function readCache(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function writeCache(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // The calculator can continue with its in-memory fallback.
    }
  }

  function loadFxRates() {
    const cached = readCache(FX_CACHE_KEY);
    if (cached && cached.rates && Date.now() - cached.ts < FX_CACHE_TTL && toNumber(cached.rates.KES) > 0) {
      fxRates = Object.assign({}, fxRates, cached.rates, { USD: 1 });
      return Promise.resolve(fxRates);
    }

    const sharedCache = readCache(SHARED_FX_CACHE_KEY);
    if (sharedCache && Date.now() - sharedCache.ts < FX_CACHE_TTL && toNumber(sharedCache.rate) > 0) {
      fxRates.KES = toNumber(sharedCache.rate);
    }

    return fetch(FX_API)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("FX request failed with status " + response.status + ".");
        }
        return response.json();
      })
      .then(function (data) {
        if (!data.rates || toNumber(data.rates.KES) === null) {
          throw new Error("FX response did not contain a USD/KES rate.");
        }

        fxRates = Object.assign({}, data.rates, { USD: 1 });
        writeCache(FX_CACHE_KEY, { rates: fxRates, ts: Date.now() });
        writeCache(SHARED_FX_CACHE_KEY, { rate: fxRates.KES, ts: Date.now() });
        return fxRates;
      })
      .catch(function () {
        return fxRates;
      });
  }

  function formatAum(value) {
    if (!Number.isFinite(value)) {
      return "Not reported";
    }
    if (value >= 1000000000) {
      return "KSh " + formatNumber(value / 1000000000, 2) + "B";
    }
    if (value >= 1000000) {
      return "KSh " + formatNumber(value / 1000000, 1) + "M";
    }
    return "KSh " + formatNumber(value, 0);
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value + "T00:00:00Z");
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function normaliseFund(row) {
    return {
      id: row["Fund ID"],
      provider: row.Provider,
      name: row["Fund Name"],
      strategy: row.Strategy,
      currency: row.Currency || "KES",
      rate: toNumber(row["Projection Rate (%)"]),
      rateType: row["Rate Type"],
      ratePeriod: row["Rate Period"],
      minimumInvestment: toNumber(row["Minimum Investment"]),
      minimumTopUp: toNumber(row["Minimum Top Up"]),
      lockInMonths: toNumber(row["Lock-in (Months)"]),
      withdrawalTime: row["Withdrawal Time"],
      managementFee: row["Management Fee"],
      performanceFee: row["Performance Fee"],
      aum: toNumber(row["AUM (KES)"]),
      marketShare: toNumber(row["Market Share (%)"]),
      aumDate: row["AUM Date"],
      lastUpdated: row["Last Updated"],
      status: row.Status,
      performanceSource: row["Performance Source"],
      termsSource: row["Terms Source"]
    };
  }

  function detailMarkup(label, value) {
    return "<div class=\"special-funds-calculator__detail\">" +
      "<span class=\"special-funds-calculator__detail-label\">" + escapeHtml(label) + "</span>" +
      "<span class=\"special-funds-calculator__detail-value\">" + escapeHtml(value) + "</span>" +
      "</div>";
  }

  function initCalculator() {
    const calculator = document.getElementById("specialFundsCalculator");
    if (!calculator) {
      return;
    }

    const form = document.getElementById("specialFundsForm");
    const fundSelect = document.getElementById("specialFund");
    const initialInput = document.getElementById("specialInitial");
    const monthlyInput = document.getElementById("specialMonthly");
    const rateInput = document.getElementById("specialAnnualRate");
    const yearsInput = document.getElementById("specialYears");
    const initialLabel = document.getElementById("specialInitialLabel");
    const monthlyLabel = document.getElementById("specialMonthlyLabel");
    const details = document.getElementById("specialFundDetails");
    const detailsContent = document.getElementById("specialFundDetailsContent");
    const rateSource = document.getElementById("specialRateSource");
    const validation = document.getElementById("specialFundsValidation");
    const results = document.getElementById("specialFundsResults");
    const dataStatus = document.getElementById("specialFundsDataStatus");
    const csvUrl = calculator.dataset.csvUrl;
    const bondUrl = calculator.dataset.bondUrl;
    const maximumAmount = 1000000000000000;
    let funds = [];

    function selectedFund() {
      return funds.find(function (fund) {
        return fund.id === fundSelect.value;
      }) || null;
    }

    function showValidation(message) {
      validation.textContent = message;
      validation.hidden = false;
    }

    function clearValidation() {
      validation.textContent = "";
      validation.hidden = true;
    }

    function showFundDetails(fund) {
      if (!fund) {
        details.hidden = true;
        details.open = false;
        detailsContent.innerHTML = "";
        return;
      }

      const aumShare = formatAum(fund.aum) +
        (fund.marketShare !== null ? " · " + formatNumber(fund.marketShare, 1) + "% share" : "");
      const minimum = fund.minimumInvestment !== null
        ? formatMoney(fund.minimumInvestment, fund.currency)
        : "Check fund terms";
      const lockIn = fund.lockInMonths !== null
        ? formatNumber(fund.lockInMonths, 0) + (fund.lockInMonths === 1 ? " month" : " months")
        : "Check fund terms";

      detailsContent.innerHTML =
        detailMarkup("Provider", fund.provider) +
        detailMarkup("Strategy", fund.strategy + " · " + fund.currency) +
        detailMarkup("AUM at 30 Jun 2026", aumShare) +
        detailMarkup("Minimum investment", minimum) +
        detailMarkup("Initial lock-in", lockIn) +
        detailMarkup("CMA reporting status", fund.status || "Reported Q2 2026");
      details.hidden = false;
    }

    function applySpearheadBondRate(observation) {
      if (!observation) {
        return;
      }

      const fund = funds.find(function (candidate) {
        return candidate.id === SPEARHEAD_FUND_ID;
      });
      const targetRate = spearheadTargetRate(observation.yield);

      if (!fund || targetRate === null) {
        return;
      }

      fund.rate = targetRate;
      fund.rateType = "Kenya 10Y " + formatNumber(observation.yield, 2) + "% + 3.0% target premium";
      fund.ratePeriod = "Bond yield at " + formatDate(observation.date);
    }

    function updateForFund() {
      const fund = selectedFund();
      clearValidation();
      showFundDetails(fund);

      if (!fund) {
        initialLabel.textContent = "Initial investment";
        monthlyLabel.textContent = "Monthly contribution";
        rateSource.textContent = "";
        rateInput.value = "";
        return;
      }

      initialLabel.textContent = "Initial investment (" + fund.currency + ")";
      monthlyLabel.textContent = "Monthly contribution (" + fund.currency + ")";
      initialInput.placeholder = fund.minimumInvestment !== null
        ? "Minimum " + formatMoney(fund.minimumInvestment, fund.currency)
        : "Enter starting amount";
      monthlyInput.placeholder = fund.minimumTopUp !== null
        ? "Minimum top-up " + formatMoney(fund.minimumTopUp, fund.currency)
        : "Enter 0 for no monthly contribution";

      if (fund.rate !== null) {
        rateInput.value = String(fund.rate);
        rateSource.textContent = [fund.rateType, fund.ratePeriod].filter(Boolean).join(" · ");
      } else {
        rateInput.value = "";
        rateSource.textContent = "Enter the fund's latest net annual return";
      }
    }

    function populateFunds() {
      fundSelect.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select a Special Fund";
      fundSelect.appendChild(placeholder);

      funds.forEach(function (fund) {
        const option = document.createElement("option");
        const rateLabel = fund.rate !== null ? " · " + formatNumber(fund.rate, 2) + "%" : "";
        option.value = fund.id;
        option.textContent = fund.name + " [" + fund.currency + "]" + rateLabel;
        fundSelect.appendChild(option);
      });

      fundSelect.disabled = false;
      const latestDate = funds.reduce(function (latest, fund) {
        return fund.lastUpdated > latest ? fund.lastUpdated : latest;
      }, "");
      dataStatus.textContent = funds.length + " funds · Updated " + formatDate(latestDate);
      dataStatus.dataset.state = "ready";
    }

    function renderResults(fund, projection, annualRate, months, monthly) {
      const currency = fund.currency;
      const years = months / 12;
      const conversion = convertFinalValue(projection.finalValue, currency, fxRates);
      const conversionMarkup = conversion
        ? "<p class=\"special-funds-calculator__result-conversion\">≈ " +
            escapeHtml(formatMoney(conversion.value, conversion.currency, conversion.currency === "USD" ? 2 : 0)) +
            "</p>"
        : "";
      const topUpNote = monthly > 0 && fund.minimumTopUp !== null
        ? " The calculation uses " + formatMoney(monthly, currency) + " per month, matching the fund's stated minimum top-up."
        : "";

      results.innerHTML =
        "<div class=\"special-funds-calculator__result-head\">" +
          "<div>" +
            "<p class=\"special-funds-calculator__result-label\">Projected value after " +
              escapeHtml(formatNumber(years, years % 1 === 0 ? 0 : 2)) + (years === 1 ? " year" : " years") + "</p>" +
            "<p class=\"special-funds-calculator__result-value\">" + escapeHtml(formatMoney(projection.finalValue, currency)) + "</p>" +
            conversionMarkup +
          "</div>" +
          "<span class=\"special-funds-calculator__result-rate\">" + escapeHtml(formatNumber(annualRate, 2)) + "% net p.a.</span>" +
        "</div>" +
        "<div class=\"special-funds-calculator__result-grid\">" +
          "<div class=\"special-funds-calculator__result-card\">" +
            "<span class=\"special-funds-calculator__result-card-label\">Total contributed</span>" +
            "<span class=\"special-funds-calculator__result-card-value\">" + escapeHtml(formatMoney(projection.totalContributions, currency)) + "</span>" +
          "</div>" +
          "<div class=\"special-funds-calculator__result-card\">" +
            "<span class=\"special-funds-calculator__result-card-label\">Estimated growth</span>" +
            "<span class=\"special-funds-calculator__result-card-value\">" + escapeHtml(formatMoney(projection.estimatedGrowth, currency)) + "</span>" +
          "</div>" +
          "<div class=\"special-funds-calculator__result-card\">" +
            "<span class=\"special-funds-calculator__result-card-label\">Monthly compounding rate</span>" +
            "<span class=\"special-funds-calculator__result-card-value\">" + escapeHtml(formatNumber(projection.monthlyRate * 100, 3)) + "%</span>" +
          "</div>" +
        "</div>" +
        "<p class=\"special-funds-calculator__result-note\">This projection compounds the entered net annual return monthly and adds contributions at the end of each month." + escapeHtml(topUpNote) + "</p>";
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearValidation();

      const fund = selectedFund();
      const initial = Number(initialInput.value);
      const monthly = Number(monthlyInput.value);
      const annualRate = Number(rateInput.value);
      const years = Number(yearsInput.value);

      if (!fund) {
        showValidation("Select a Special Fund.");
        fundSelect.focus();
        return;
      }
      if (initialInput.value.trim() === "" || !Number.isFinite(initial) || initial <= 0 || initial > maximumAmount) {
        showValidation("Enter an initial investment greater than zero and below 1 quadrillion.");
        initialInput.focus();
        return;
      }
      if (fund.minimumInvestment !== null && initial < fund.minimumInvestment) {
        showValidation("The listed minimum investment for this fund is " + formatMoney(fund.minimumInvestment, fund.currency) + ".");
        initialInput.focus();
        return;
      }
      if (monthlyInput.value.trim() === "" || !Number.isFinite(monthly) || monthly < 0 || monthly > maximumAmount) {
        showValidation("Enter a monthly contribution from zero to 1 quadrillion.");
        monthlyInput.focus();
        return;
      }
      if (monthly > 0 && fund.minimumTopUp !== null && monthly < fund.minimumTopUp) {
        showValidation("Enter zero or at least " + formatMoney(fund.minimumTopUp, fund.currency) + " for this fund's minimum top-up.");
        monthlyInput.focus();
        return;
      }
      if (rateInput.value.trim() === "" || !Number.isFinite(annualRate) || annualRate <= -100 || annualRate > 200) {
        showValidation("Enter a net annual return above -100% and no higher than 200%.");
        rateInput.focus();
        return;
      }
      if (yearsInput.value.trim() === "" || !Number.isFinite(years) || years < 0.25 || years > 50) {
        showValidation("Enter an investment period from 0.25 to 50 years.");
        yearsInput.focus();
        return;
      }

      const months = Math.round(years * 12);
      const projection = projectValue(initial, monthly, annualRate, months);
      renderResults(fund, projection, annualRate, months, monthly);
    });

    fundSelect.addEventListener("change", updateForFund);

    loadFxRates();

    const fundDataRequest = fetch(csvUrl, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Data request failed with status " + response.status + ".");
        }
        return response.text();
      });

    const bondDataRequest = bondUrl
      ? fetch(bondUrl, { cache: "no-store" })
          .then(function (response) {
            if (!response.ok) {
              throw new Error("Bond data request failed with status " + response.status + ".");
            }
            return response.text();
          })
          .then(function (text) {
            return latestBondObservation(parseCsv(text));
          })
          .catch(function () {
            return null;
          })
      : Promise.resolve(null);

    Promise.all([fundDataRequest, bondDataRequest])
      .then(function (responses) {
        funds = parseCsv(responses[0])
          .map(normaliseFund)
          .filter(function (fund) { return fund.id && fund.name; })
          .sort(function (a, b) { return (b.aum || 0) - (a.aum || 0); });

        if (funds.length === 0) {
          throw new Error("No fund rows were found in the data file.");
        }

        applySpearheadBondRate(responses[1]);
        populateFunds();
      })
      .catch(function () {
        dataStatus.textContent = "Fund data could not load";
        dataStatus.dataset.state = "error";
        fundSelect.innerHTML = "<option value=\"\">Fund list unavailable</option>";
        showValidation("The fund list is temporarily unavailable. Refresh the page and try again.");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCalculator);
  } else {
    initCalculator();
  }
}());
