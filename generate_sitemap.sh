#!/bin/bash
# Generate sitemap.xml and sitemap.xml.gz with current date
# Then generate sitemap_index.xml that lists both

today=$(date +"%Y-%m-%d")

# Start sitemap.xml
cat > sitemap.xml <<EOL
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://kenyammfcalculator.co.ke/</loc>
    <lastmod>$today</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
EOL

# Loop through all .html files in current folder
for file in *.html; do
  echo "  <url>" >> sitemap.xml
  echo "    <loc>https://kenyammfcalculator.co.ke/$file</loc>" >> sitemap.xml
  echo "    <lastmod>$today</lastmod>" >> sitemap.xml
  echo "    <changefreq>monthly</changefreq>" >> sitemap.xml
  echo "    <priority>0.8</priority>" >> sitemap.xml
  echo "  </url>" >> sitemap.xml
done

# Close sitemap.xml
echo "</urlset>" >> sitemap.xml

# Create compressed sitemap
gzip -c sitemap.xml > sitemap.xml.gz

# Generate sitemap index
cat > sitemap_index.xml <<EOL
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://kenyammfcalculator.co.ke/sitemap.xml</loc>
    <lastmod>$today</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://kenyammfcalculator.co.ke/sitemap.xml.gz</loc>
    <lastmod>$today</lastmod>
  </sitemap>
</sitemapindex>
EOL
