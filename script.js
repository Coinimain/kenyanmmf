/* ---- Kenya MMF site script (guarded) ---- */

let funds = []; // Global array to store all fund data
const exchangeRate = 129; // KES per USD as of Aug 18, 2025

// Mapping of short provider names to full Provider names in data.csv
const providerMapping = {
  Cytonn: 'Cytonn Unit Trust Scheme',
  Gulfcap: 'GCIB Unit Trust Funds',
  Etica: 'Etica Unit Trust Funds',
  Kuza: 'Kuza Asset Management Unit Trust Scheme',
  'Lofty Corban': 'Lofty Corban Unit Trust Scheme',
};

// ---------- Utilities ----------
const $id = (id) => document.getElementById(id);
const hasEl = (id) => !!$id(id);

// ---------- Data + Providers ----------
async function loadProviders() {
  const select = $id('provider');
  if (!select) {
    console.warn('loadProviders skipped: #provider not found on this page.');
    return;
  }

  try {
    console.log('Fetching data.csv at:', new Date().toISOString());
    const response = await fetch('data.csv', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load data.csv: ${response.status} ${response.statusText}`);

    const text = await response.text();
    const rows = text.split('\n').slice(1); // Skip header

    select.innerHTML = '<option value="">Select a provider</option>';
    funds = [];

    rows.forEach((row, index) => {
      const [provider, fundName, rate, fees, minInvestment, payoutFrequency, lastUpdated, currency] =
        row.split(',').map((item) => (item ?? '').trim());

      const rateNum = parseFloat(rate);
      const feesNum = parseFloat(fees);
      const minInvNum = parseFloat(minInvestment);

      if (provider && fundName && !Number.isNaN(rateNum) && currency) {
        funds.push({
          provider,
          fundName,
          rate: rateNum,
          fees: Number.isNaN(feesNum) ? 0 : feesNum,
          minInvestment: Number.isNaN(minInvNum) ? 0 : minInvNum,
          payoutFrequency,
          lastUpdated,
          currency,
        });

        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${provider} - ${fundName} (${rateNum}%) [${currency}]`;
        select.appendChild(option);
      } else if (row.trim() !== '') {
        console.warn('Skipping invalid row:', row);
      }
    });

    // Bind once (avoid duplicate listeners if user reloads data)
    select.removeEventListener('change', updateCurrencyLabels);
    select.addEventListener('change', updateCurrencyLabels);

    // Build chart if the canvas exists
    generateComparisonChart();
  } catch (error) {
    console.error('Error loading providers:', error);
    const results = $id('results');
    if (results) results.innerHTML = 'Error: Unable to load provider data. Please try again later.';
  }
}

function updateCurrencyLabels() {
  const select = $id('provider');
  if (!select) return;

  const idx = select.value;
  if (idx === '') return;

  const selectedFund = funds[idx];
  if (!selectedFund) return;

  const currencySymbol = selectedFund.currency === 'USD' ? 'USD' : 'KES';
  const initialLabel = $id('initialLabel');
  const monthlyLabel = $id('monthlyLabel');
  if (initialLabel) initialLabel.textContent = `Initial Investment (${currencySymbol}):`;
  if (monthlyLabel) monthlyLabel.textContent = `Monthly Contribution (${currencySymbol}):`;
}

// ---------- Calculator ----------
function calculateReturns() {
  const select = $id('provider');
  const results = $id('results');
  if (!select || !results) {
    console.warn('calculateReturns skipped: missing #provider or #results');
    return;
  }
  const idx = select.value;
  if (idx === '') {
    results.innerHTML = 'Please select a provider.';
    return;
  }

  const selectedFund = funds[idx];
  if (!selectedFund) {
    results.innerHTML = 'Invalid provider selection.';
    return;
  }

  const providerRate = selectedFund.rate / 100;
  const initial = parseFloat(($id('initial')?.value ?? '').trim());
  const monthly = parseFloat(($id('monthly')?.value ?? '').trim()) || 0;
  const years = parseFloat(($id('years')?.value ?? '').trim());

  if (Number.isNaN(initial) || Number.isNaN(years)) {
    results.innerHTML = 'Please fill all required fields.';
    return;
  }

  const months = Math.max(0, Math.floor(years * 12));
  let total = initial;
  for (let i = 0; i < months; i++) {
    total += monthly;
    total *= 1 + providerRate / 12;
  }

  const currencySymbol = selectedFund.currency === 'USD' ? '$' : 'KES ';
  const minInvestmentFormatted = (selectedFund.minInvestment || 0).toLocaleString(
    selectedFund.currency === 'USD' ? 'en-US' : 'en-KE',
  );

  let html = `
    <p>Estimated Returns: ${currencySymbol}${total.toFixed(2)}</p>
    <p>Minimum Investment Required: ${currencySymbol}${minInvestmentFormatted}</p>
  `;

  if (selectedFund.currency === 'USD') {
    const kesEquivalent = total * exchangeRate;
    html += `<p>(Equivalent: KES ${kesEquivalent.toFixed(2)} at ${exchangeRate} KES/USD)</p>`;
  } else {
    const usdEquivalent = total / exchangeRate;
    html += `<p>(Equivalent: $${usdEquivalent.toFixed(2)} at ${exchangeRate} KES/USD)</p>`;
  }

  results.innerHTML = html;
}

// ---------- Chart ----------
function generateComparisonChart() {
  const canvas = $id('mmfChart');
  if (!canvas) {
    console.info('Chart skipped: #mmfChart not found on this page.');
    return;
  }
  if (!window.Chart) {
    console.warn('Chart.js not loaded; cannot render chart.');
    canvas.style.display = 'none';
    return;
  }

  // Destroy any existing chart
  if (window.mmfChartInstance) {
    try {
      window.mmfChartInstance.destroy();
    } catch (e) {
      console.error('Error destroying previous chart instance:', e);
    }
  }

  const providersToCompare = ['Cytonn', 'Gulfcap', 'Etica', 'Kuza', 'Lofty Corban'];
  const selectedFunds = funds.filter((fund) =>
    providersToCompare.some((p) => fund.provider === providerMapping[p]),
  );

  if (selectedFunds.length === 0) {
    console.warn('No matching funds for chart. Providers in data:', [...new Set(funds.map((f) => f.provider))]);
    canvas.style.display = 'none';
    return;
  }

  const returnsData = selectedFunds.map((fund) => {
    const shortName = Object.keys(providerMapping).find((k) => providerMapping[k] === fund.provider) || fund.provider;
    return { label: `${shortName} [${fund.currency}]`, value: fund.rate, currency: fund.currency };
  });

  const maxRate = Math.max(...returnsData.map((d) => d.value));
  const yAxisMax = Math.max(15, Math.ceil(maxRate * 1.1));

  const ctx = canvas.getContext('2d');
  try {
    window.mmfChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: returnsData.map((d) => d.label),
        datasets: [
          {
            label: 'Annualized Return (%)',
            data: returnsData.map((d) => d.value),
            backgroundColor: '#2E7D32',
            borderColor: '#1B5E20',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Top MMF Providers (2025)' },
          tooltip: {
            callbacks: {
              label(ctx) {
                return `Annual Return: ${ctx.parsed.y.toFixed(2)}%`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            min: 0,
            max: yAxisMax,
            title: { display: true, text: 'Annualized Return (%)' },
          },
        },
      },
    });
    console.log('Chart created successfully');
  } catch (error) {
    console.error('Error creating chart:', error);
  }
}

// ---------- Bootstrap (only on pages that need it) ----------
document.addEventListener('DOMContentLoaded', () => {
  // Bind Calculate button if present
  const calculateButton = $id('calculateButton');
  if (calculateButton) {
    calculateButton.addEventListener('click', calculateReturns);
  }

  // Provider select present? load data + labels
  if (hasEl('provider')) {
    loadProviders().catch((e) => console.error('loadProviders failed:', e));
  }

  // Currency labels update when selection changes (safety re-bind)
  const select = $id('provider');
  if (select) select.addEventListener('change', updateCurrencyLabels);

  // Navigation toggle (only if nav exists)
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => navLinks.classList.toggle('show'));
  }
});
