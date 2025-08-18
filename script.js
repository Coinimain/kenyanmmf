let funds = []; // Global array to store all fund data
const exchangeRate = 129; // KES per USD as of August 18, 2025

async function loadProviders() {
  try {
    const response = await fetch('data.csv');
    if (!response.ok) {
      throw new Error('Failed to load data.csv: ' + response.statusText);
    }
    const text = await response.text();
    const rows = text.split('\n').slice(1); // Skip header
    const select = document.getElementById('provider');
    select.innerHTML = '<option>Select a provider</option>';
    rows.forEach((row, index) => {
      const [provider, fundName, rate, fees, minInvestment, payoutFrequency, lastUpdated, currency] = row.split(',').map(item => item.trim());
      if (provider && fundName && rate && !isNaN(parseFloat(rate))) {
        funds.push({ provider, fundName, rate: parseFloat(rate), fees: parseFloat(fees), minInvestment: parseFloat(minInvestment), payoutFrequency, lastUpdated, currency });
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${provider} - ${fundName} (${rate}%) [${currency}]`;
        select.appendChild(option);
      }
    });
    select.addEventListener('change', updateCurrencyLabels);
    // Generate comparison chart after loading funds
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
  // Select providers for comparison (from index.html dropdown)
  const providersToCompare = ['Cytonn', 'Gulfcap', 'Etica', 'Kuza', 'Lofty Corban'];
  const selectedFunds = funds.filter(fund => providersToCompare.some(provider => fund.provider.includes(provider)));
  
  // Calculate 1-year returns for $1000 (USD) or KES 100,000 (KES)
  const initialInvestmentKES = 100000;
  const initialInvestmentUSD = 1000;
  const months = 12;
  const returnsData = selectedFunds.map(fund => {
    const initial = fund.currency === 'USD' ? initialInvestmentUSD : initialInvestmentKES;
    let total = initial;
    for (let i = 0; i < months; i++) {
      total *= (1 + fund.rate / 100 / 12); // Monthly compounding
    }
    return {
      label: `${fund.fundName} [${fund.currency}]`,
      value: total,
      currency: fund.currency
    };
  });

  // Create chart
  const ctx = document.getElementById('mmfChart').getContext('2d');
  new Chart(ctx, {
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