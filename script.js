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
    select.innerHTML = '<option>Select a provider</option>'; // Reset options
    rows.forEach((row, index) => {
      const [provider, fundName, rate, fees, minInvestment, payoutFrequency, lastUpdated, currency] = row.split(',').map(item => item.trim());
      if (provider && fundName && rate && !isNaN(parseFloat(rate))) {
        funds.push({ provider, fundName, rate: parseFloat(rate), fees: parseFloat(fees), minInvestment: parseFloat(minInvestment), payoutFrequency, lastUpdated, currency });
        const option = document.createElement('option');
        option.value = index; // Use index as value for lookup
        option.textContent = `${provider} - ${fundName} (${rate}%) [${currency}]`;
        select.appendChild(option);
      }
    });
    // Add event listener for currency-based label updates
    select.addEventListener('change', updateCurrencyLabels);
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
  // Optional: Show equivalent in other currency
  if (selectedFund.currency === 'USD') {
    const kesEquivalent = total * exchangeRate;
    resultHTML += `<p>(Equivalent: KES ${kesEquivalent.toFixed(2)} at ${exchangeRate} KES/USD)</p>`;
  } else {
    const usdEquivalent = total / exchangeRate;
    resultHTML += `<p>(Equivalent: $${usdEquivalent.toFixed(2)} at ${exchangeRate} KES/USD)</p>`;
  }
  document.getElementById('results').innerHTML = resultHTML;
}

window.onload = loadProviders;