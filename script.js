async function loadProviders() {
  try {
    const response = await fetch('data.csv');
    if (!response.ok) {
      throw new Error('Failed to load data.csv: ' + response.statusText);
    }
    const text = await response.text();
    const rows = text.split('\n').slice(1); // Skip header
    const select = document.getElementById('provider');
    select.innerHTML = ''; // Clear existing options
    rows.forEach(row => {
      const [provider, fundName, rate, fees, minInvestment, payoutFrequency, lastUpdated] = row.split(',').map(item => item.trim());
      if (provider && fundName && rate && !isNaN(parseFloat(rate))) {
        const option = document.createElement('option');
        option.value = rate;
        option.textContent = `${provider} - ${fundName} (${rate}%)`;
        select.appendChild(option);
      }
    });
  } catch (error) {
    console.error('Error loading providers:', error);
    document.getElementById('result').innerHTML = 'Error: Unable to load provider data. Please try again later.';
  }
}

function calculateReturns() {
  const providerRate = parseFloat(document.getElementById('provider').value) / 100;
  const initial = parseFloat(document.getElementById('initial').value);
  const monthly = parseFloat(document.getElementById('monthly').value);
  const years = parseFloat(document.getElementById('years').value);
  if (!providerRate || !initial || !years) {
    document.getElementById('result').innerHTML = 'Please fill all required fields.';
    return;
  }
  const months = years * 12;
  let total = initial;
  for (let i = 0; i < months; i++) {
    total += monthly;
    total *= (1 + providerRate / 12);
  }
  document.getElementById('result').innerHTML = `Estimated Returns: KES ${total.toFixed(2)}`;
}

window.onload = loadProviders;
