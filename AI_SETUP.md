# Lowpoly Studio AI backend

This project is hosted on GitHub Pages, which cannot safely store a private 3D-generation API key. The optional Cloudflare Worker in `worker/index.js` keeps the Tripo API key server-side.

## One-time setup

1. Create a Tripo API account and API key in the [Tripo console](https://platform.tripo3d.ai/).
2. Install Node.js 20+ and Wrangler: `npm install -g wrangler`.
3. In the repository root, sign in to Cloudflare: `wrangler login`.
4. Deploy the Worker: `wrangler deploy`.
5. Add the secret without committing it: `wrangler secret put TRIPO_API_KEY`, then paste the key into the interactive prompt.
6. The deploy output prints a URL similar to `https://lowpoly-studio-ai.<your-account>.workers.dev`.
7. Open Lowpoly Studio, expand **AI Text-to-3D**, paste that Worker URL into **AI backend URL**, and save it. Use the full URL without a trailing slash.

The frontend only stores the public Worker URL in this browser; it never asks for or stores the provider key. The Worker accepts requests only from the configured GitHub Pages origin by default. If you host the app elsewhere, update `ALLOWED_ORIGIN` in `wrangler.toml` before deploying.

## What it does

- Sends a shape-first, low-poly prompt to Tripo's P-series text-to-3D API.
- Requests a 5,000-face budget and no texture/PBR maps.
- Polls the asynchronous task status and loads the generated GLB into the existing viewport.
- Keeps the procedural catalog available as a fast local fallback when the AI backend is not configured or a request fails.

Tripo usage can consume credits. Review your account's pricing and limits before generating many models. AI meshes still need inspection in Blender/Maya; this app's basic checks do not guarantee manifold topology, clean edge flow, or production-ready retopology.

## API routes

- `POST /api/generate` with `{"prompt":"a clock with a curved rim and modeled numerals"}`
- `GET /api/tasks/<taskId>` to retrieve status, progress, and the resulting model URL.

Never put `TRIPO_API_KEY` in `index.html`, `src/app.js`, a committed `.env` file, or any browser-visible configuration.
