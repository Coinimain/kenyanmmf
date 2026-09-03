/* Oman currency article converter — uses the site's existing FX provider. */
(function () {
  "use strict";

  const root = document.getElementById("omrKesConverter");
  if (!root) return;

  const FX_API = "https://open.er-api.com/v6/latest/OMR";
  const FX_CACHE_KEY = "omr_kes_rate_v1";
  const FX_CACHE_TTL = 12 * 60 * 60 * 1000;
  const FALLBACK_KES_RATE = 336.71347;
  const FALLBACK_USD_RATE = 2.6008;

  const form = document.getElementById("omrKesForm");
  const input = document.getElementById("omrAmount");
  const amountDisplay = document.getElementById("omrAmountDisplay");
  const result = document.getElementById("kesResult");
  const rateStatus = document.getElementById("omrKesRateStatus");
  const omrUsdRate = document.getElementById("omrUsdRate");

  let kesRate = FALLBACK_KES_RATE;
  let usdRate = FALLBACK_USD_RATE;

  const kesFormatter = new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const omrFormatter = new Intl.NumberFormat("en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

  const rateFormatter = new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function formatKes(value) {
    return `KSh${kesFormatter.format(value)}`;
  }

  function readCache() {
    try {
      const cached = localStorage.getItem(FX_CACHE_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      if (
        !Number.isFinite(parsed.kesRate) ||
        parsed.kesRate <= 0 ||
        !Number.isFinite(parsed.ts)
      ) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  function writeCache(payload) {
    try {
      localStorage.setItem(FX_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // The converter still works when storage is blocked.
    }
  }

  function updateStatus() {
    rateStatus.textContent = `1 OMR ≈ KSh${rateFormatter.format(kesRate)}`;
  }

  function updateReferenceValues() {
    document.querySelectorAll("[data-omr-amount]").forEach((cell) => {
      const amount = Number(cell.dataset.omrAmount);
      if (Number.isFinite(amount)) cell.textContent = formatKes(amount * kesRate);
    });

    document.querySelectorAll("[data-baisa-amount]").forEach((cell) => {
      const amount = Number(cell.dataset.baisaAmount);
      if (Number.isFinite(amount)) {
        cell.textContent = formatKes((amount / 1000) * kesRate);
      }
    });

    if (omrUsdRate) {
      omrUsdRate.textContent = `USD${usdRate.toFixed(4)}`;
    }
  }

  function convert() {
    const rawAmount = input.value.trim();
    const amount = Number(rawAmount);

    if (rawAmount === "" || !Number.isFinite(amount) || amount < 0) {
      amountDisplay.textContent = "Enter a valid OMR amount";
      result.textContent = "—";
      root.classList.add("fx-converter--error");
      return;
    }

    root.classList.remove("fx-converter--error");
    amountDisplay.textContent = `OMR ${omrFormatter.format(amount)}`;
    result.textContent = formatKes(amount * kesRate);
  }

  function applyRate(nextKesRate, nextUsdRate) {
    kesRate = nextKesRate;
    usdRate = nextUsdRate || FALLBACK_USD_RATE;
    convert();
    updateReferenceValues();
    updateStatus();
  }

  async function loadRate() {
    const cached = readCache();
    const cacheIsFresh = cached && Date.now() - cached.ts < FX_CACHE_TTL;

    if (cacheIsFresh) {
      applyRate(
        cached.kesRate,
        cached.usdRate
      );
      return;
    }

    try {
      const response = await fetch(FX_API);
      if (!response.ok) throw new Error("Exchange-rate request failed");

      const data = await response.json();
      const nextKesRate = Number(data?.rates?.KES);
      const nextUsdRate = Number(data?.rates?.USD);

      if (!Number.isFinite(nextKesRate) || nextKesRate <= 0) {
        throw new Error("Exchange-rate response did not include KES");
      }

      const sourceUpdatedAt = data.time_last_update_utc || Date.now();
      writeCache({
        kesRate: nextKesRate,
        usdRate: Number.isFinite(nextUsdRate) ? nextUsdRate : FALLBACK_USD_RATE,
        sourceUpdatedAt,
        ts: Date.now(),
      });

      applyRate(
        nextKesRate,
        Number.isFinite(nextUsdRate) ? nextUsdRate : FALLBACK_USD_RATE
      );
    } catch {
      if (cached) {
        applyRate(
          cached.kesRate,
          cached.usdRate
        );
        return;
      }

      applyRate(
        FALLBACK_KES_RATE,
        FALLBACK_USD_RATE
      );
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    convert();
  });

  input.addEventListener("input", convert);

  convert();
  updateReferenceValues();
  loadRate();
})();
