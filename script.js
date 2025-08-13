let funds = [];

async function loadData() {
    try {
        const response = await fetch('./data.csv');
        const text = await response.text();
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',');
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const fund = {};
            for (let j = 0; j < headers.length; j++) {
                fund[headers[j].trim()] = values[j] ? values[j].trim() : '';
            }
            funds.push(fund);
        }
        populateDropdown();
    } catch (error) {
        console.error('Error loading CSV:', error);
        alert('Failed to load fund data. Check if data.csv exists.');
    }
}

function populateDropdown() {
    const select = document.getElementById('fundSelect');
    funds.forEach((fund, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = fund['Fund Name'];
        select.appendChild(option);
    });
    select.addEventListener('change', showFundDetails);
}

function showFundDetails(e) {
    const index = e.target.value;
    const detailsDiv = document.getElementById('fundDetails');
    detailsDiv.innerHTML = '';
    if (index === '') return;
    const fund = funds[index];
    detailsDiv.innerHTML = `
        <p><strong>Provider:</strong> ${fund.Provider}</p>
        <p><strong>Interest Rate (% p.a.):</strong> ${fund['Interest Rate (%)']}</p>
        <p><strong>Fees (% p.a.):</strong> ${fund['Fees (%)']}</p>
        <p><strong>Minimum Investment (KSh):</strong> ${fund['Minimum Investment']}</p>
        <p><strong>Payout Frequency:</strong> ${fund['Payout Frequency']}</p>
        <p><strong>Last Updated:</strong> ${fund['Last Updated']}</p>
    `;
}

function calculateReturns() {
    const index = document.getElementById('fundSelect').value;
    if (index === '') return alert('Please select a fund.');
    const fund = funds[index];
    const initial = parseFloat(document.getElementById('initial').value);
    const monthlyCont = parseFloat(document.getElementById('monthly').value) || 0;
    const months = parseInt(document.getElementById('months').value);
    const minInvest = parseInt(fund['Minimum Investment']);
    if (isNaN(initial) || initial < minInvest) return alert(`Initial investment must be at least KSh ${minInvest}.`);
    if (isNaN(months) || months < 1) return alert('Duration must be at least 1 month.');

    // Net annual rate (after fees)
    const netAnnualRate = parseFloat(fund['Interest Rate (%)']) - parseFloat(fund['Fees (%)']);
    const monthlyRate = (netAnnualRate / 100) / 12;

    // Future value of initial investment
    const fvInitial = initial * Math.pow(1 + monthlyRate, months);

    // Future value of monthly contributions (annuity formula)
    let fvMonthly = 0;
    if (monthlyCont > 0) {
        fvMonthly = monthlyCont * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    }

    const totalFV = fvInitial + fvMonthly;
    const totalInvested = initial + (monthlyCont * months);
    const grossInterest = totalFV - totalInvested;
    const tax = grossInterest * 0.15; // 15% withholding tax on interest
    const netInterest = grossInterest - tax;
    const netFV = totalInvested + netInterest;

    document.getElementById('results').innerHTML = `
        <p><strong>Total Invested:</strong> KSh ${totalInvested.toFixed(2)}</p>
        <p><strong>Gross Interest Earned:</strong> KSh ${grossInterest.toFixed(2)}</p>
        <p><strong>Tax (15% on Interest):</strong> KSh ${tax.toFixed(2)}</p>
        <p><strong>Net Interest Earned:</strong> KSh ${netInterest.toFixed(2)}</p>
        <p><strong>Net Future Value:</strong> KSh ${netFV.toFixed(2)}</p>
    `;
}

loadData();