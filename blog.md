---
layout: null
title: Blog
permalink: /blog/
---

<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Blog | Kenya MMF Calculator</title>
  <link rel="stylesheet" href="/style.css" />
</head>

<body>
  <div style="max-width: 900px; margin: 2rem auto; padding: 0 1rem;">
    <p><a href="/">← Back to Calculator</a></p>
    <h1>Blog</h1>
    <p>Practical guides and updates on money market funds, savings, and personal finance in Kenya.</p>

    <hr />

    {% if site.posts.size == 0 %}
      <p><em>No posts yet — coming soon.</em></p>
    {% else %}
      <ul>
        {% for post in site.posts %}
          <li style="margin: 0 0 1rem 0;">
            <a href="{{ post.url }}">{{ post.title }}</a><br />
            <small>{{ post.date | date: "%B %d, %Y" }}</small>
          </li>
        {% endfor %}
      </ul>
    {% endif %}

  </div>
</body>
</html>
