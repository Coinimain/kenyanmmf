#!/bin/bash
# Generate sitemap.xml from built site in _site/
# Includes /blog/ and posts, excludes internal folders/files

set -e

today=$(date +"%Y-%m-%d")
base="https://kenyammfcalculator.co.ke"

# Ensure site is built
if [ ! -d "_site" ]; then
  echo "ERROR: _site/ not found. Run: bundle exec jekyll build"
  exit 1
fi

# Start sitemap.xml
cat > sitemap.xml <<EOL
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
EOL

# Function: add one URL entry
add_url () {
  local url="$1"
  local priority="$2"
  local freq="$3"

  cat >> sitemap.xml <<EOL
  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>
EOL
}

# Always include homepage
add_url "${base}/" "1.0" "weekly"

# Find HTML pages in _site, excluding internal/undesired paths
# - exclude feed.xml, sitemap files, assets, and any dot folders
# - convert /index.html to trailing slash URLs
while IFS= read -r file; do
  # Skip root index.html (already added as /)
  if [ "$file" = "_site/index.html" ]; then
    continue
  fi

  # Convert file path to URL path
  path="${file#_site}"          # remove leading _site
  url="${base}${path}"

  # Pretty URL for index pages
  if [[ "$url" == *"/index.html" ]]; then
    url="${url%/index.html}/"
  fi

  # Choose priority/frequency (simple rules)
  if [[ "$url" == "${base}/blog/" ]]; then
    pr="0.8"; cf="weekly"
  elif [[ "$url" == ${base}/20*/*/*/* ]]; then
    pr="0.7"; cf="monthly"
  else
    pr="0.6"; cf="monthly"
  fi

  add_url "$url" "$pr" "$cf"
done < <(
  find _site -type f -name "*.html" \
    ! -path "_site/assets/*" \
    ! -path "_site/images/*" \
    ! -path "_site/scripts/*" \
    ! -path "_site/.jekyll-cache/*" \
    ! -path "_site/_site/*" \
    ! -name "feed.xml" \
    ! -name "sitemap.xml" \
    ! -name "sitemap_index.xml" \
    ! -name "404.html" \
    ! -name "footer.html" \
    ! -name "header.html" \
    ! -name "nav.html" \
    | sort
)


# Close sitemap.xml
echo "</urlset>" >> sitemap.xml

# Create compressed sitemap
gzip -c sitemap.xml > sitemap.xml.gz

# Generate sitemap index
cat > sitemap_index.xml <<EOL
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${base}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${base}/sitemap.xml.gz</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>
EOL

echo "Done: sitemap.xml, sitemap.xml.gz, sitemap_index.xml"
