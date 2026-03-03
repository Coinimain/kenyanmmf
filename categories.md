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
    {% assign count = c[1].size %}
    <a class="cat-card" href="{{ '/category/' | append: name | append: '/' | relative_url }}">
      <div class="cat-card__top">
        <div class="cat-card__title">{{ name | replace: '-', ' ' }}</div>
        <div class="cat-card__count">{{ count }}</div>
      </div>

      {% if name == "nse" %}
        <div class="cat-card__desc">NSE guides, trading basics, fees, settlement</div>
      {% elsif name == "ipo" %}
        <div class="cat-card__desc">How IPOs work, timelines, risks, allocation</div>
      {% elsif name == "investing" %}
        <div class="cat-card__desc">Step-by-step investing guides for Kenya</div>
      {% elsif name == "tax" %}
        <div class="cat-card__desc">Practical tax explainers and compliance</div>
      {% elsif name == "stocks" %}
        <div class="cat-card__desc">Stock investing guides and walkthroughs</div>
      {% elsif name == "real-estate" %}
        <div class="cat-card__desc">REITs, property basics, risk and returns</div>
      {% elsif name == "fixed-income" %}
        <div class="cat-card__desc">Bonds, T-bills, yields, and income strategies</div>
      {% elsif name == "dividends" %}
        <div class="cat-card__desc">Dividend schedules, income investing, payouts</div>
      {% elsif name == "business" %}
        <div class="cat-card__desc">Small business + freelancer money guides</div>
      {% elsif name == "kenya" %}
        <div class="cat-card__desc">Kenya-specific explainers and updates</div>
      {% else %}
        <div class="cat-card__desc">Browse posts in this category</div>
      {% endif %}
    </a>
  {% endfor %}
</div>