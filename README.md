# Kenya MMF Calculator

## Production deployment

GitHub Actions builds the Jekyll site, minifies CSS and JavaScript inside `_site`,
and deploys the generated artifact to GitHub Pages. Source assets remain readable
and are never minified in place.

To test the production asset build locally:

```bash
bundle exec jekyll build
npm ci --ignore-scripts
npm run minify -- _site
```
