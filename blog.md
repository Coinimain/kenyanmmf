---
layout: default
title: Blog
description: Practical guides and updates on money market funds, savings, and personal finance in Kenya.
permalink: /blog/
last_modified_at: "2026-02-16"
---

<div class="blog-wrap">
  <p class="blog-back"><a href="/">← Back to Calculator</a></p>

  <h1>Blog</h1>
  <p>Practical guides and updates on money market funds, savings, and personal finance in Kenya.</p>

  <hr class="blog-divider" />

  {% if site.posts.size == 0 %}
    <p><em>No posts yet — coming soon.</em></p>
  {% else %}
    <div class="blog-list">
      {% for post in site.posts %}

        {% assign words = post.content | strip_html | number_of_words %}
        {% assign minutes = words | plus: 199 | divided_by: 200 %}
        {% if minutes < 1 %}{% assign minutes = 1 %}{% endif %}


        <a class="blog-card {% if forloop.first %}blog-card--featured{% endif %}" href="{{ post.url }}">
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
