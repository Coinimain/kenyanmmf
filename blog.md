---

layout: null

title: Blog

permalink: /blog/

---



<!doctype html>

<html lang="en">

<head>

&nbsp; <meta charset="utf-8" />

&nbsp; <meta name="viewport" content="width=device-width,initial-scale=1" />

&nbsp; <title>Blog | Kenya MMF Calculator</title>

&nbsp; <link rel="stylesheet" href="/style.css" />

</head>

<body>

&nbsp; <div style="max-width: 900px; margin: 2rem auto; padding: 0 1rem;">

&nbsp;   <p><a href="/">← Back to Calculator</a></p>

&nbsp;   <h1>Blog</h1>

&nbsp;   <p>Practical guides and updates on money market funds, savings, and personal finance in Kenya.</p>



&nbsp;   <hr />



&nbsp;   <ul>

&nbsp;     {% raw %}{% for post in site.posts %}{% endraw %}

&nbsp;       <li style="margin: 0 0 1rem 0;">

&nbsp;         <a href="{% raw %}{{ post.url }}{% endraw %}">{% raw %}{{ post.title }}{% endraw %}</a><br />

&nbsp;         <small>{% raw %}{{ post.date | date: "%B %d, %Y" }}{% endraw %}</small>

&nbsp;       </li>

&nbsp;     {% raw %}{% endfor %}{% endraw %}

&nbsp;   </ul>



&nbsp;   <p><em>No posts yet — coming soon.</em></p>

&nbsp; </div>

</body>

</html>



