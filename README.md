# Lowpoly Studio

A voice-first, browser-based low-poly 3D blockout studio. Describe a simple object, inspect its procedural mesh in a rotatable viewport, refine supported details, and export geometry for Blender or Autodesk Maya.

## Current prototype

- **Microphone prompts:** browser speech recognition where supported; type-to-prompt remains available.
- **Interactive 3D viewport:** orbit, zoom, perspective and orthographic projection, front/side views, framing, selectable scene parts, solid, wireframe, X-ray, vertex points, ground grid, and hard-edge overlay.
- **One-click mesh cleanup:** merges coincident vertices and removes non-finite or zero-area triangles where possible; it reports what it changed and does not claim to repair every non-manifold or misplaced-vertex issue.
- **Procedural object library:** tabletop fan, frog, shoe/sneaker, chair, table, mug, bottle, house, tree, lamp, robot, car, sofa, speaker, crate, mushroom, rock, and gear, with separately selectable named parts where available.
- **Prompt refinements:** supported example commands include making the base wider, changing blade count, tilting the fan head, and resetting the model.
- **3D exports:** OBJ (Blender and Maya), binary STL, and GLB (Blender; Maya compatibility depends on installed import support).
- **Glass UI:** responsive, translucent panels inspired by Apple's system design language.
- **Local-first:** prompt handling and mesh generation run in the browser; no AI service or prompt upload is configured.

## Try it

https://wonka15.github.io/Low-poly-generator/

If GitHub Pages is not enabled yet, open **Settings → Pages** and choose **GitHub Actions** as the deployment source.

## Run locally

Serve the folder over HTTP (the browser module imports and microphone APIs need a local server or HTTPS):

```bash
python3 -m http.server 8000
```

Open http://localhost:8000.

## Notes on speech and mesh quality

Microphone access requires permission and a supported browser. Speech recognition support varies by browser; the app provides a text prompt fallback. GitHub Pages is HTTPS, which is suitable for browser microphone permissions.

This is currently a **procedural prototype**, not a connected generative-AI service. Voice prompts are matched to a small set of deterministic fan-edit commands. Exports are standard interchange formats; inspect topology, scale, normals, and part intersections in Blender or Maya before using a model in production. Separate overlapping components are intentional in this blockout and are not a single watertight manifold shell.

## Test

Requires Node.js 20 or newer.

```bash
npm run check
npm test
```

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
