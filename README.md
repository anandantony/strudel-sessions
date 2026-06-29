# Strudel Showcase

A retro music showcase for Strudel-based pieces, designed for static hosting on
GitHub Pages.

The app is a Vite + React + TypeScript showcase with a cassette/vinyl carousel,
a visualizer-style background, local track source loading, real Strudel playback,
and a flip-open source panel.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Project Conventions

- Bootstrap frameworks with their official create commands.
- Add new npm dependencies with the `@latest` tag unless a compatibility reason
  requires a pinned version.
- Keep showcase application licensing separate from musical work licensing.
- Keep track source files under `public/tracks` so the deployed player can load
  them as static assets.
- Strudel playback is lazy-loaded on first play through `@strudel/web`.
- The player preloads `github:tidalcycles/dirt-samples` for common sample names
  such as `bd`, `sd`, `hh`, and `cp`.
- The player registers `@strudel/soundfonts` so `gm_*` instruments used by
  showcase tracks can play in the browser.

## Licensing

The showcase application code is intended for AGPL-3.0-or-later distribution.
Replace the placeholder `LICENSE` file with the full license text before
publishing.

The musical compositions and Strudel source files under `public/tracks` are
separately licensed. See `public/tracks/LICENSE.txt`.

This project is not an official Strudel project. See `NOTICE` for attribution
and integration notes.
