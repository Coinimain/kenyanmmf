let funds = []; // Global array to store all fund data
const exchangeRate = 129; // KES per USD as of August 18, 2025

// Mapping of short provider names to full Provider names in data.csv
const providerMapping = {
  'Cytonn': 'Cytonn Unit Trust Scheme',
  'Gulfcap': 'GCIB Unit Trust Funds',
  'Etica': 'Etica Unit Trust Funds',
  'Kuza': 'Kuza Asset Management Unit Trust Scheme',
  'Lofty Corban': 'Lofty Corban Unit Trust Scheme'
};

async function loadProviders() {
  try {
    console.log('Fetching data.csv at:', new Date().toISOString());
    const response = await fetch('data.csv');
    if (!response.ok) {
      throw new Error('Failed to load data.csv: ' + response.statusText);
    }
    const text = await response.text();
    console.log('Raw CSV data (first 200 chars):', text.substring(0, 200));
    const rows = text.split('\n').slice(1); // Skip header
    const select = document.getElementById('provider');
    select.innerHTML = '<option>Select a provider</option>';
    funds = [];
    rows.forEach((row, index) => {
      const [provider, fundName, rate, fees, minInvestment, payoutFrequency, lastUpdated, currency] = row.split(',').map(item => item.trim());
      if (provider && fundName && rate && !isNaN(parseFloat(rate)) && currency) {
        funds.push({ provider, fundName, rate: parseFloat(rate), fees: parseFloat(fees), minInvestment: parseFloat(minInvestment), payoutFrequency, lastUpdated, currency });
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${provider} - ${fundName} (${rate}%) [${currency}]`;
        select.appendChild(option);
      } else {
        console.warn('Skipping invalid row:', row);
      }
    });
    console.log('Parsed funds:', funds.map(f => ({ provider: f.provider, fundName: f.fundName, rate: f.rate, currency: f.currency })));
    select.addEventListener('change', updateCurrencyLabels);
    generateComparisonChart();
  } catch (error) {
    console.error('Error loading providers:', error);
    document.getElementById('results').innerHTML = 'Error: Unable to load provider data. Please try again later.';
  }
}

function updateCurrencyLabels() {
  const selectedIndex = document.getElementById('provider').value;
  if (selectedIndex === '') return;
  const selectedFund = funds[selectedIndex];
  const currencySymbol = selectedFund.currency === 'USD' ? 'USD' : 'KES';
  document.getElementById('initialLabel').textContent = `Initial Investment (${currencySymbol}):`;
  document.getElementById('monthlyLabel').textContent = `Monthly Contribution (${currencySymbol}):`;
}

function calculateReturns() {
  const selectedIndex = document.getElementById('provider').value;
  if (selectedIndex === '') {
    document.getElementById('results').innerHTML = 'Please select a provider.';
    return;
  }
  const selectedFund = funds[selectedIndex];
  const providerRate = selectedFund.rate / 100;
  const initial = parseFloat(document.getElementById('initial').value);
  const monthly = parseFloat(document.getElementById('monthly').value) || 0;
  const years = parseFloat(document.getElementById('years').value);
  if (isNaN(initial) || isNaN(years)) {
    document.getElementById('results').innerHTML = 'Please fill all required fields.';
    return;
  }
  const months = years * 12;
  let total = initial;
  for (let i = 0; i < months; i++) {
    total += monthly;
    total *= (1 + providerRate / 12);
  }
  const currencySymbol = selectedFund.currency === 'USD' ? '$' : 'KES ';
  const minInvestmentFormatted = selectedFund.minInvestment.toLocaleString(selectedFund.currency === 'USD' ? 'en-US' : 'en-KE');
  let resultHTML = `
    <p>Estimated Returns: ${currencySymbol}${total.toFixed(2)}</p>
    <p>Minimum Investment Required: ${currencySymbol}${minInvestmentFormatted}</p>
  `;
  if (selectedFund.currency === 'USD') {
    const kesEquivalent = total * exchangeRate;
    resultHTML += `<p>(Equivalent: KES ${kesEquivalent.toFixed(2)} at ${exchangeRate} KES/USD)</p>`;
  } else {
    const usdEquivalent = total / exchangeRate;
    resultHTML += `<p>(Equivalent: $${usdEquivalent.toFixed(2)} at ${exchangeRate} KES/USD)</p>`;
  }
  document.getElementById('results').innerHTML = resultHTML;
}

function generateComparisonChart() {
  console.log('Generating chart at:', new Date().toISOString());
  const providersToCompare = ['Cytonn', 'Gulfcap', 'Etica', 'Kuza', 'Lofty Corban'];
  const selectedFunds = funds.filter(fund => 
    providersToCompare.some(provider => fund.provider === providerMapping[provider])
  );
  if (selectedFunds.length === 0) {
    console.error('No matching funds found for chart. Available providers:', [...new Set(funds.map(f => f.provider))]);
    document.getElementById('mmfChart').style.display = 'none';
    return;
  }
  console.log('Selected funds for chart:', selectedFunds.map(f => ({ provider: f.provider, fundName: f.fundName, rate: f.rate, currency: f.currency })));

  const initialInvestmentKES = 100000;
  const initialInvestmentUSD = 1000;
  const months = 12;
  const returnsData = selectedFunds.map(fund => {
    const initial = fund.currency === 'USD' ? initialInvestmentUSD : initialInvestmentKES;
    let total = initial;
    for (let i = 0; i < months; i++) {
      total *= (1 + fund.rate / 100 / 12);
    }
    const shortName = Object.keys(providerMapping).find(key => providerMapping[key] === fund.provider);
    return {
      label: `${shortName} [${fund.currency}]`,
      value: total,
      currency: fund.currency
    };
  });
  console.log('Chart data:', returnsData);

  const ctx = document.getElementById('mmfChart').getContext('2d');
  if (window.mmfChartInstance) {
    window.mmfChartInstance.destroy();
    console.log('Destroyed existing chart instance');
  }
  window.mmfChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: returnsData.map(data => data.label),
      datasets: [{
        label: '1-Year Returns',
        data: returnsData.map(data => data.value),
        backgroundColor: ['#2E7D32', '#FFB300', '#4CAF50', '#FFCA28', '#66BB6A', '#1B5E20', '#FFA000', '#388E3C'],
        borderColor: ['#1B5E20', '#FFA000', '#388E3C', '#FFB300', '#4CAF50', '#2E7D32', '#FFCA28', '#66BB6A'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Returns (KES or USD)'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const index = context.dataIndex;
              const currency = returnsData[index].currency;
              const value = context.parsed.y.toFixed(2);
              return `Returns: ${currency === 'USD' ? '$' : 'KES '}${value}`;
            }
          }
        },
        legend: {
          display: false
        }
      }
    }
  });
}

window.onload = loadProviders;