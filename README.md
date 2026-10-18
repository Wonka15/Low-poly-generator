# Lowpoly Studio

A browser-based generative-art studio for creating low-poly landscapes, abstract compositions, and geometric gradients. No account, backend, or upload required.

## Features

- Three composition styles: landscape, abstract, and gradient.
- Six palettes: Dusk, Forest, Candy, Ocean, Monochrome, and Ember.
- Adjustable triangle density and color variation.
- Reproducible seeds: the same seed and settings regenerate the same art.
- Export scalable SVG or high-resolution 2× PNG.
- Responsive desktop and mobile interface.
- Local-first generation: artwork stays in your browser.
- GitHub Actions for automated tests and Pages deployment.

## Try it

When GitHub Pages deployment completes, open: https://wonka15.github.io/Low-poly-generator/

## Run locally

Requires Python 3 or another static HTTP server. No dependency installation is required for the app.

```bash
python3 -m http.server 8000
```

Open http://localhost:8000.

## Test

Requires Node.js 20 or newer.

```bash
npm run check
npm test
```

## Publish on GitHub Pages

The workflow at `.github/workflows/pages.yml` publishes the site on each push to `main`. In **Settings → Pages**, choose **GitHub Actions** as the deployment source if asked. The test workflow runs syntax checks and unit tests on pushes and pull requests.

## Project layout

```text
.
├── .github/workflows/pages.yml
├── .github/workflows/test.yml
├── src/app.js
├── src/generator.js
├── tests/generator.test.js
├── index.html
├── styles.css
└── package.json
```

## License

MIT. See [LICENSE](LICENSE).
