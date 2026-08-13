# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Моя Планета** (`my-planet-earth.ru`) — an interactive, Russian-language WebGL globe that
demonstrates the *true size* of countries. You pick a country and drag its outline across a
spinning 3D Earth; the outline is re-projected to preserve its real metric dimensions, so as it
moves toward the equator you see how much flat (Mercator) maps inflate high-latitude countries.
Inspired by the "true size" genre (see the YouTube Short linked in the UI).

Single-page app. Language is Russian (`lang="ru"`). Everything is self-contained — no runtime
network calls, no map-tile server, no image textures. The globe (ocean sphere + country borders +
graticule) is drawn entirely from bundled GeoJSON-derived data.

## Commands

```bash
npm run dev       # Vite dev server (honours PORT env; falls back to 5173)
npm run build     # Production build -> dist/
npm run preview   # Preview the production build
```

No test runner or linter is configured. The geometry math is validated with a standalone Node
script when needed (see "Verifying the math" below) — there is no `npm test`.

## Stack

- **Vue 3** (`<script setup>`, script-setup SFCs) + **Vite** — see `package.json` for exact versions.
- **Three.js** (`three`, incl. `three/addons/controls/OrbitControls.js`) for the WebGL globe.
- **earcut** for polygon triangulation of country fills.

## Architecture

Vue owns only the UI shell and reactive state. All Three.js lives in a plain class kept **out of
Vue's reactivity** — never wrap THREE objects in `ref`/`reactive`.

- `src/App.vue` — the entire UI: country `<select>`, preset chips, live readout, rotate toggle,
  YouTube example card. Owns reactive state (`selectedId`, `readout`, `dragged`, `autoRotate`) and
  bridges to the engine via `engine.onMove` (called on every drag update) and the `selectedId`
  watcher (calls `engine.selectCountry` / `focusOn`).
- `src/lib/globe.js` — `GlobeEngine` class. Scene/camera/renderer/OrbitControls, ocean sphere,
  atmosphere, graticule, all country borders as one `LineSegments`, and the draggable "ghost"
  (highlighted country). Owns the pointer-drag interaction and the render loop.
- `src/lib/geo.js` — the pure geometry/math (no Three.js, unit-testable in Node).
- `src/data/countries.js` — generated data module (see below). **Do not hand-edit.** Loaded via
  a **dynamic `import()`** in `App.vue`'s `onMounted` (Vite splits it into its own async chunk), so
  the globe shell renders before the ~1.4 MB dataset arrives. It is held in a `shallowRef` — never
  make the country array deeply reactive (Vue would proxy every polygon vertex).
- `index.html` — SEO lives here (see "SEO").

### Coordinate convention

`latLngToVector3(lat, lng, radius)` in `geo.js` is the single source of truth for lat/lng → 3D:
`x = R·cos(lat)·cos(lng)`, `y = R·sin(lat)`, `z = −R·cos(lat)·sin(lng)` (+Y = north pole).
Inverse (used when raycasting the ocean to find where the pointer is): `lat = asin(y/|p|)`,
`lng = atan2(−z, x)`. Keep every lat/lng↔3D conversion consistent with this or borders, picking,
and dragging will silently disagree.

### The true-size mechanic (the core idea)

In `geo.js`:

1. `prepareCountry(country)` (once per selection) converts each polygon vertex into local
   **east/north offsets in km** relative to the country's centroid (equirectangular local
   projection), runs `earcut`, then **subdivides** the triangles until every edge is shorter than
   `MAX_EDGE_KM`. Subdivision is essential: without it, a large country's big flat triangles chord
   *through* the sphere and its interior sinks below the ocean surface, producing a hollow "hole".
2. `projectCountry(prepared, lng, lat, radius)` (every drag frame) places those km-offsets at the
   target centroid and lifts each vertex back onto the sphere. Real metric size is preserved; only
   the angular footprint changes with latitude — that *is* the demonstration.
3. `stretchFactor(lat) = 1/cos(lat)` — how much a flat map stretches width at a latitude; shown in
   the readout (both at the country's home latitude and at the current drag latitude).

**Known limitation:** the local flat projection distorts for countries spanning a huge longitude
range (Russia ≈ +9% area error at the equator). This is inherent to the genre's approach, not a
bug — don't "fix" it by special-casing.

### Interaction details worth knowing

- **Drag vs. rotate:** `pointerdown` is listened for in the **capture phase on `window`** so the
  engine can `stopImmediatePropagation()` before OrbitControls sees it — but only when the ray hits
  the selected country's fill. Grab the highlighted country → drag it; empty space → rotate the
  planet. Removing the capture listener will make every drag rotate the globe instead.
- **Focus on select:** camera latitude is clamped (±55°) so polar countries (Greenland, Russia)
  aren't viewed straight down from over the pole. Auto-rotate is turned off on selection.
- **`OrbitControls` in this Three.js version has no `setAzimuthalAngle`/`setPolarAngle` setters** —
  only getters. Orient the camera by lerping `camera.position` (auto-rotate off), not via angle
  setters.

## Data pipeline

`src/data/countries.js` is generated from **Natural Earth 1:50m Admin-0**, release **v5.0.0**
(published Nov 2021, public domain) — the full set of **242** countries and dependencies, boundaries
as of 2021. (The earlier 1:110m set had only 177 and omitted small/island states.) Each entry is
`{ id, ru, en, area, centroid, polygons }`:

- `id` = `ADM0_A3` (always unique — do **not** use `ISO_A2`/`ISO_A3`; they are `-99` for France,
  Norway, Kosovo, etc. and collide).
- `ru` = `NAME_RU` (Russian display name); `area` = spherical polygon area in km²; coordinates
  rounded to 0.01°.

To regenerate (e.g. to bump the Natural Earth release, or drop to 1:110m to shrink the payload),
re-run the processing script that fetches the `ne_50m_admin_0_countries.geojson` for the desired
release tag, trims to the fields above, computes spherical area/centroid, rounds coords to 0.01°,
de-duplicates ids, and writes the module. The preset chips in `App.vue` reference A3 ids (`RUS`,
`GRL`, `CAN`, …) — keep them in sync with the data.

## SEO

Because this is a single static page, all SEO is baked directly into `index.html` (served as-is by
Vite — no SSR needed): unique `<title>`/description, canonical `https://my-planet-earth.ru/`,
Open Graph + Twitter cards, and JSON-LD (`WebSite` + `WebApplication`). `public/robots.txt` and
`public/sitemap.xml` use absolute URLs matching the canonical base. `public/og-image.svg` is the
share image (swap in a raster PNG if you need maximum crawler compatibility, and update the
`og:image*` tags). If you ever add a second page, add its head block and a `<url>` to the sitemap.

## Analytics and consent

Google Analytics (`G-VL99Y456DV`) and Yandex.Metrika (`111534910`) are **not** in `index.html`.
They are injected at runtime by `src/lib/legal.js` **only after the visitor consents** — do not
paste counter snippets into the HTML, that would load them before consent and make the consent
form a lie. Consent is granular and genuinely wired: `analytics` gates both counters, `webvisor`
gates Metrika's `webvisor`/`clickmap` session recording (passed straight into `ym(..., 'init')`).
The choice lives in `localStorage` under `mp-consent-v2`; revoking it after the counters loaded
triggers a page reload, since scripts cannot be unloaded. `src/components/LegalNotice.vue` is the
banner + form. The site requests **no** browser permissions (camera/mic/geolocation/notifications).

## Conventions

Follows the workspace HTML/CSS/JS conventions in `~/CLAUDE.md`: design tokens in `:root`
(`src/style.css`), BEM-like hyphenated class names, mobile-first with breakpoints at
`max-width: 1080px` and `760px` (panel docks to the bottom on phones), no `!important`. Russian
copy throughout, including code comments in the `lib/` modules.

## Verifying the math

There is no test harness, but `geo.js` is pure and importable in Node. When changing the
projection/subdivision, sanity-check with a throwaway script that imports `prepareCountry` /
`projectCountry` and asserts: fill area at the home latitude ≈ real area; area roughly preserved
when moved to the equator; and the longitude footprint shrinks toward the equator for high-latitude
countries. Note that the dev-server preview tab throttles `requestAnimationFrame` when
backgrounded, so browser-driven interaction tests are unreliable — prefer verifying the math in
Node and the visuals via screenshots.
