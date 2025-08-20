#!/bin/bash
   # Add CSP and other security meta tags to all HTML files

   CSP_META='<meta http-equiv="Content-Security-Policy" content="default-src '\''self'\''; script-src '\''self'\'' https://cdn.jsdelivr.net; style-src '\''self'\''; img-src '\''self'\'' data:; object-src '\''none'\''; base-uri '\''self'\'';">'
   REFERRER_META='<meta http-equiv="Referrer-Policy" content="no-referrer">'
   HSTS_META='<meta http-equiv="Strict-Transport-Security" content="max-age=31536000; includeSubDomains">'
   XCTO_META='<meta http-equiv="X-Content-Type-Options" content="nosniff">'

   for file in *.html; do
       if [ -f "$file" ]; then
           echo "Updating $file..."
           # Check and add CSP
           if ! grep -q "Content-Security-Policy" "$file"; then
               sed -i '/<head>/a\'"$CSP_META" "$file"
               echo "Added CSP meta tag to $file"
           else
               echo "CSP meta tag already exists in $file, skipping"
           fi
           # Check and add Referrer-Policy
           if ! grep -q "Referrer-Policy" "$file"; then
               sed -i '/<head>/a\'"$REFERRER_META" "$file"
               echo "Added Referrer-Policy meta tag to $file"
           else
               echo "Referrer-Policy meta tag already exists in $file, skipping"
           fi
           # Check and add Strict-Transport-Security
           if ! grep -q "Strict-Transport-Security" "$file"; then
               sed -i '/<head>/a\'"$HSTS_META" "$file"
               echo "Added Strict-Transport-Security meta tag to $file"
           else
               echo "Strict-Transport-Security meta tag already exists in $file, skipping"
           fi
           # Check and add X-Content-Type-Options
           if ! grep -q "X-Content-Type-Options" "$file"; then
               sed -i '/<head>/a\'"$XCTO_META" "$file"
               echo "Added X-Content-Type-Options meta tag to $file"
           else
               echo "X-Content-Type-Options meta tag already exists in $file, skipping"
           fi
       fi
   done

   echo "All HTML files updated with security meta tags"