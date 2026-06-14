---
layout: default
title: "Categories"
permalink: /categories/
---

<nav class="cats-nav" aria-label="Category navigation">
  <a class="post-categories__chip" href="{{ '/blog/' | relative_url }}">Back to Blog</a>
  <a class="post-categories__chip" href="{{ '/' | relative_url }}">Home</a>
</nav>

<div class="cat-grid" aria-label="All categories">
  {% assign cats = site.categories | sort %}
  {% for c in cats %}
{% assign name = c[0] %}
{% assign slug = name | slugify %}
{% assign count = c[1].size %}

{% assign display_name = name | replace: '-', ' ' %}
{% if slug == "ipo" %}
  {% assign display_name = "IPO" %}
{% elsif slug == "nse" %}
  {% assign display_name = "NSE" %}
{% endif %}

    <a class="cat-card" href="{{ '/category/' | append: slug | append: '/' | relative_url }}">
      <div class="cat-card__top">
        <div class="cat-card__title">{{ display_name }}</div>
        <div class="cat-card__count">{{ count }}</div>
      </div>

      {% if slug == "nse" %}
        <div class="cat-card__desc">NSE guides, trading basics, fees, settlement</div>
      {% elsif slug == "ipo" %}
        <div class="cat-card__desc">How IPOs work, timelines, risks, allocation</div>
      {% elsif slug == "investing" %}
        <div class="cat-card__desc">Step-by-step investing guides for Kenya</div>
      {% elsif slug == "tax" %}
        <div class="cat-card__desc">Practical tax explainers and compliance</div>
      {% elsif slug == "stocks" %}
        <div class="cat-card__desc">Stock investing guides and walkthroughs</div>
      {% elsif slug == "global-stocks" %}
        <div class="cat-card__desc">Guides on buying and trading international stocks from Kenya</div>
      {% elsif slug == "money-market-funds" %}
        <div class="cat-card__desc">MMF rates, fees, taxes, withdrawals, and fund comparisons</div>
      {% elsif slug == "remittances" %}
        <div class="cat-card__desc">Money transfer guides, costs, platforms, and practical tips</div>
      {% elsif slug == "real-estate" %}
        <div class="cat-card__desc">REITs, property basics, risk and returns</div>
      {% elsif slug == "fixed-income" %}
        <div class="cat-card__desc">Bonds, T-bills, yields, and income strategies</div>
      {% elsif slug == "dividends" %}
        <div class="cat-card__desc">Dividend schedules, income investing, payouts</div>
      {% elsif slug == "business" %}
        <div class="cat-card__desc">Small business + freelancer money guides</div>
      {% elsif slug == "kenya" %}
        <div class="cat-card__desc">Kenya-specific explainers and updates</div>
      {% else %}
        <div class="cat-card__desc">Browse posts in this category</div>
      {% endif %}
    </a>
  {% endfor %}
</div>