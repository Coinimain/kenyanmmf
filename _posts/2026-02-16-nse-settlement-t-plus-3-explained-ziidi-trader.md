---
layout: post
title: "NSE Settlement Explained: What T+3 Means (and Why Ziidi Trader Won’t Trade on Weekends)"
description: "A plain-English guide to how NSE trades actually settle after you click Buy/Sell in Ziidi Trader—what T+3 means, what happens between trade date and settlement, and the common reasons Ziidi Trader shows “not working” (like weekends and market hours)."
permalink: /blog/nse-settlement-t-plus-3-explained-ziidi-trader/
categories:
  - Investing
  - Stocks
tags:
  - nse settlement
  - t+3 meaning
  - ziidi trader not working
  - mpesa ziidi trader
  - kenya stocks
image: /assets/images/nse-settlement-t-plus-3-ziidi-trader-market-closed-2026-1600x900.png
image_alt: "NSE settlement (T+3) explained in plain English — why Ziidi Trader shows “Market Closed” on weekends"
image_caption: "NSE settlement cycle (T+3) and why Ziidi Trader trades only during NSE market hours."
image_source_name: "Kenya MMF Calculator"
image_license: "Original graphic © Kenya MMF Calculator"

faq:
  - q: "What does T+3 mean on the NSE?"
    a: "T is the trade date (the day your order is matched). T+3 means the trade settles three business days after the trade date, when the market completes delivery obligations for cash and securities."
  - q: "Is NSE settlement T+2 or T+3 in Kenya?"
    a: "For NSE equity trades, settlement is T+3. T+2 is common in other markets, which is why people mix the terms."
  - q: "Why does Ziidi Trader say “market closed”?"
    a: "Ziidi Trader can only place trades when the Nairobi Securities Exchange is open. If you try to trade on weekends, public holidays, or outside NSE trading hours, you will see “market closed.”"
  - q: "Why is my Ziidi Trader order not executing even during market hours?"
    a: "An order only executes if it matches on price with an opposing order. If your buy price is too low (or sell price too high), or the stock has low liquidity, the order can remain unfilled even though the market is open."
  - q: "Do Ziidi Trader trades settle instantly?"
    a: "A trade can be matched quickly during market hours, but settlement follows the exchange settlement cycle. Match/execution and settlement are different steps."
---

## Quick answers (NSE settlement + Ziidi Trader)

- **What does T+3 mean?** Your trade is done on **T (trade date)**, then it completes **3 business days later** (**T+3**)-that’s when the official cash/securities delivery obligations are fulfilled.  
- **Why is Ziidi Trader not working today?** If it’s a **weekend/public holiday** or **outside NSE trading hours**, you can’t execute trades because the market is closed.   
- **Do I get shares instantly?** You can see an “executed/matched” trade quickly, but **settlement** (the final delivery of cash and securities in the market system) follows the exchange settlement cycle.  
- **Is it T+2 or T+3 in Kenya?** Under the NSE Equity Trading Rules, **equity transactions settle on T+3**. (T+2 is common in other markets, so people mix the terms.)  
- **What’s the biggest mistake beginners make?** Confusing **execution (matched trade)** with **settlement (final completion)**.

---

## The simple picture: “Trade” vs “Settlement”

When you tap **Buy** or **Sell** in a platform like Ziidi Trader, two different things happen:

1) **Execution (matching):** your order finds a matching buyer/seller in the market order book.  
2) **Settlement:** the market’s back-office process completes—cash and securities are delivered according to the settlement cycle.

Execution can happen in seconds **during market hours**. Settlement happens later (T+3 for NSE equities, per the rules).  

---

## What does “T” and “T+3” actually mean?

The NSE Trading Rules define:

- **T** = the day the transaction is effected (trade date)  
- **T+1, T+2, T+3** = 1, 2, or 3 business days after trade date  

And the rules state that **transactions are settled by T+3**.  

So if you buy shares on **Monday (T)**, settlement completes on **Thursday (T+3)** (assuming no public holidays in between).

---

## Why Ziidi Trader won’t trade on weekends (and what “not working” usually means)
> If Ziidi Trader says **“market closed,”** you’re almost always outside NSE trading hours (**Mon–Fri, 9:30am–3:00pm**).

If someone tried trading on a weekend, the most likely explanation is simply:

- **The NSE is closed**, so there is no live matching engine session running.

The NSE trading day is structured and time-bound. Trading runs during market hours, and the day closes at **3:00 p.m.**

### The common “Ziidi Trader not working” causes (in order)

- **Weekend / public holiday** (market closed)  
- **Outside trading hours** (market closed)  
- **Market halt / security halt** (a pause can occur under certain conditions)  
- **Your order can’t match** (no seller at your price, or no buyer at your sell price)  
- **Connectivity / app update / KYC verification issues** (platform-side)

## “Ziidi Trader Not Working” Example: The Market Is Closed

A common issue is seeing “market closed” when trying to buy or sell shares in Ziidi Trader.

Safaricom has clarified that the market is open:

**Monday–Friday, 9:30am–3:00pm.**

So if you try placing a trade on a **weekend**, or **before 9:30am** or **after 3:00pm**, you’ll see “market closed” because there is no live trading session running.

---

## What happens after you click Buy: the settlement timeline (plain English)

Here’s the “back-office” journey in simple steps:

### 1) You place an order
You choose a stock, quantity, and price type. Your order goes into the market system.

### 2) Matching happens in the order book
Orders are ranked by **price first, then time**, and matching happens when buy/sell prices meet.  

If your order doesn’t match, nothing “breaks”—it just sits unfilled until it’s cancelled/expired.

### 3) Trade date is recorded (T)
Once matched, the trade exists and will move to the settlement process. The market now expects:
- seller delivers shares
- buyer delivers cash  
…and the system coordinates delivery.

### 4) Settlement completes on T+3 (for NSE equities)
The Trading Rules state settlement is **by T+3**.  

That T+3 window is basically the market’s standard time to finalize delivery obligations.

---

## Why you may see “credits” fast but settlement still matters

Some platforms can show balances updated quickly after matching (especially inside a single app experience). That can *feel* like “instant settlement.”

But the market-level settlement cycle still matters because it is the formal completion of the obligations in the exchange/depository pipeline (cash and securities delivery).   

---

## Where Ziidi Trader fits in (and why “omnibus” matters)

Ziidi Trader is built around convenience: you trade inside M-PESA and your ownership is tracked within the platform’s structure.

In NSE/market language, an **Omnibus Account** is a CDS account held with **more than one beneficial owner**.  

That “omnibus” concept is why users often don’t go through the classic retail brokerage onboarding flow, while still participating in the market.

---

## What about day trading, and does it change settlement?

NSE has operational guidelines for **day trading (intra-day trading)**, defined as buying and selling the same security on the same account on the same day.  

Important point: the day trading guidelines are designed to support intraday activity **while continuing with the settlement cycle of T+3**.  

So “day trading” (buy then sell today) is about *trading behavior and handling*, not automatically “T+0 settlement” for everything.

---

## Practical tips so you don’t get surprised

### 1) If it’s Saturday/Sunday, don’t troubleshoot for 30 minutes
Just wait for a trading day and try during market hours. The market has to be open.

### 2) Don’t confuse “order placed” with “order executed”
Placed = you submitted it.  
Executed = it matched.

### 3) Use “break-even thinking” for short-term trades  
Fees + bid/ask movement can mean you need a decent price move just to break even. For the full breakdown (with real KES examples), see: [Ziidi Trader fees explained](https://kenyammfcalculator.co.ke/blog/ziidi-trader-fees-explained-trade-cost/).

### 4) If your order isn’t matching, adjust expectations (not your sanity)
Unmatched orders are normal, especially in less liquid counters.

---

## Final thoughts

If you understand **market hours**, **matching**, and **T+3 settlement**, you’ll instantly understand most Ziidi Trader “issues”-especially the weekend confusion.

Once you know the pipeline, you trade calmer: you’ll stop expecting instant settlement, you’ll stop treating “unfilled” as “broken,” and you’ll make better decisions about risk and timing.

## FAQ

{% for item in page.faq %}
<details>
  <summary><strong>{{ item.q }}</strong></summary>
  <p>{{ item.a }}</p>
</details>
{% endfor %}

