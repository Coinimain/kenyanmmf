#!/bin/bash
# Add CSP meta tag to all HTML files

CSP_META='<meta http-equiv="Content-Security-Policy" content="default-src '\''self'\''; script-src '\''self'\'' https://cdn.jsdelivr.net; style-src '\''self'\''; img-src '\''self'\'' data:; object-src '\''none'\''; base-uri '\''self'\'';">'

for file in *.html; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        # Check if CSP meta tag already exists
        if ! grep -q "Content-Security-Policy" "$file"; then
            # Insert CSP meta tag after <head>
            sed -i '/<head>/a\'"$CSP_META" "$file"
            echo "Added CSP meta tag to $file"
        else
            echo "CSP meta tag already exists in $file, skipping"
        fi
    fi
done

echo "All HTML files updated with CSP meta tag"
