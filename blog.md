---
layout: default
title: Blog
description: Practical guides and updates on money market funds, savings, and personal finance in Kenya.
permalink: /blog/
last_modified_at: "2026-09-09"
---

<div class="blog-wrap">
  <p class="blog-back"><a href="/">← Back to Calculator</a></p>

  <div class="blog-heading-row">
    <h1>Blog</h1>

    <div class="blog-search" role="search">
      <label class="visually-hidden" for="blog-search-input">Search blog articles</label>
      <svg class="blog-search__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="m20 20-4-4"></path>
      </svg>
      <input
        class="blog-search__input"
        id="blog-search-input"
        type="search"
        placeholder="Search"
        autocomplete="off"
        spellcheck="false"
        aria-controls="blog-post-list"
      />
      <button class="blog-search__clear" id="blog-search-clear" type="button" aria-label="Clear search" hidden>×</button>
    </div>
  </div>

  <p>Practical guides and updates on money market funds, savings, and personal finance in Kenya.</p>

  <!-- Featured categories strip (curated) -->
  <nav class="featured-cats" aria-label="Featured categories">
    <div class="featured-cats__label">Popular Topics:</div>
<div class="featured-cats__list">
  <a class="featured-cats__chip" href="{{ '/category/investing/' | relative_url }}">Investing</a>
  <span class="featured-sep" aria-hidden="true">|</span>

  <a class="featured-cats__chip" href="{{ '/category/nse/' | relative_url }}">NSE</a>
  <span class="featured-sep" aria-hidden="true">|</span>

  <a class="featured-cats__chip" href="{{ '/category/stocks/' | relative_url }}">Stocks</a>
  <span class="featured-sep" aria-hidden="true">|</span>

  <a class="featured-cats__chip" href="{{ '/category/fixed-income/' | relative_url }}">Fixed Income</a>
  <span class="featured-sep" aria-hidden="true">|</span>

  <a class="featured-cats__chip" href="{{ '/category/tax/' | relative_url }}">Tax</a>
  <span class="featured-sep" aria-hidden="true">|</span>

  <a class="featured-cats__chip featured-cats__chip--money"
     href="{{ '/category/remittances/' | relative_url }}">Remittances</a>
  <span class="featured-sep" aria-hidden="true">|</span>
  
  <a class="featured-cats__chip featured-cats__chip--all"
     href="{{ '/categories/' | relative_url }}">
    All Categories
  </a>
</div>
  </nav>

  <hr class="blog-divider" />

  <p class="blog-search-status" id="blog-search-status" role="status" aria-live="polite" aria-atomic="true" hidden></p>
  <p class="blog-no-results" id="blog-no-results" hidden>
    No articles found. Try a different search or browse <a href="{{ '/categories/' | relative_url }}">all categories</a>.
  </p>

  {% if site.posts.size == 0 %}
    <p><em>No posts yet — coming soon.</em></p>
  {% else %}
    <div class="blog-list" id="blog-post-list">
      {% for post in site.posts %}

        {% assign words = post.content | strip_html | number_of_words %}
        {% assign minutes = words | plus: 199 | divided_by: 200 %}
        {% if minutes < 1 %}{% assign minutes = 1 %}{% endif %}
        {% capture blog_search_text %}{{ post.title }} {{ post.description | default: post.excerpt | strip_html }} {{ post.tags | join: ' ' }} {{ post.categories | join: ' ' }}{% endcapture %}

        <a
          class="blog-card {% if forloop.first %}blog-card--featured{% endif %}"
          href="{{ post.url }}"
          data-search="{{ blog_search_text | downcase | escape }}"
        >
          <div class="blog-card-top">
            <span class="blog-card-date">{{ post.date | date: "%B %d, %Y" }}</span>
            <span class="blog-card-dot">•</span>
            <span class="blog-card-readtime">{{ minutes }} min read</span>
          </div>

          <h3 class="blog-card-title">{{ post.title }}</h3>

          {% if post.description %}
            <p class="blog-card-excerpt">{{ post.description }}</p>
          {% else %}
            <p class="blog-card-excerpt">{{ post.excerpt | strip_html | truncate: 140 }}</p>
          {% endif %}

          {% if post.tags and post.tags.size > 0 %}
            <div class="blog-card-tags">
              {% for tag in post.tags %}
                <span class="tag">{{ tag }}</span>
              {% endfor %}
            </div>
          {% endif %}
        </a>

      {% endfor %}
    </div>
  {% endif %}
</div>

<script src="{{ '/blog-search.js' | relative_url }}?v=20260909" defer></script>
