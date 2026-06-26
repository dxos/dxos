# `react-ui-geo` perf plan — viewport tiling

## Why

Raw 10m world-atlas TopoJSON is ~1 M coordinates. d3-geo's orthographic projection runs trig per coordinate per frame, so a full-globe render at 10m costs ~400 ms regardless of canvas size or per-feature culling. Per-country culling helps small countries; the six biggest (RU, CA, AQ, US, CN, BR) carry the bulk of the points and their bounding circles always intersect the visible hemisphere.

The fix is to bound the per-frame work to _what's actually visible_. That requires partitioning the data at a granularity smaller than "country", with bboxes tight enough to cull half of the world per frame on an orthographic globe.

## Approach: pre-baked vector tiles + on-demand load

Generate a spatial tile pyramid offline, ship the tiles as static assets, fetch only the tiles intersecting the current viewport, render each tile's `FeatureCollection` with the existing d3-canvas pipeline.

The pyramid is a standard `[z, x, y]` Web Mercator tile scheme. Per zoom level `z`, the world is split into `2^z × 2^z` tiles. Each tile is a JSON file (or a vector-tile PBF) containing the GeoJSON features clipped to that tile's extent. Cell size at z=2 is 90°×90° (4×4 = 16 tiles); at z=4 it's 22.5° (256 tiles); at z=6 it's ~5.6° (4096 tiles).

This is the industry-standard approach (Mapbox, MapLibre, Leaflet vector tiles). We adopt the format without adopting Mapbox-style GPU rendering — d3-canvas stays as the renderer.

## Pipeline

```
data/raw/countries-10m.json
        │
        ▼
  scripts/generate-tiles.{mjs|ts}     ← offline, runs once per source update
        │
        ▼
  data/tiles/{z}/{x}/{y}.json         ← committed (small enough) or built artifact
        │
        ▼
  loadTile(z, x, y) → FeatureCollection
        │
        ▼
  useTileSet(viewport) → FeatureCollection[]   (new hook)
        │
        ▼
  Globe.Canvas (existing renderer; features prop instead of topology)
```

## Implementation steps

### 1. Tile generation (offline)

Two viable tools:

- **`geojson-vt`** (Mapbox, ~30 KB, pure JS). In-memory tile generation from a single GeoJSON source. We'd write a Node script that loads `countries-10m.json`, instantiates a `geojson-vt` index, and walks the `[z, x, y]` space writing each tile to disk as JSON. Output is GeoJSON-compatible (one `FeatureCollection` per tile, already clipped to tile bounds). No native build steps; tiles can be regenerated in CI.
- **`tippecanoe`** (Mapbox, C++). Produces `.mbtiles` (SQLite) or a tile directory of `.pbf` (Mapbox Vector Tile binary). Industry-standard; smaller files; supports per-zoom simplification levels (`-S`, `-z`). Requires a native binary in the build environment.

**Recommendation: `geojson-vt`** for v1. Pure JS, no native dep, fits the existing build, output is JSON we can already render. If we later need the ~10× size reduction MVT gives, swap in `tippecanoe` without changing the renderer.

Script outline (`scripts/generate-tiles.mjs`):

```js
import geojsonvt from 'geojson-vt';
import { feature } from 'topojson-client';

const topology = JSON.parse(fs.readFileSync('data/raw/countries-10m.json'));
const fc = feature(topology, topology.objects.countries);
const index = geojsonvt(fc, { maxZoom: TILE_MAX_Z, tolerance: 3, extent: 4096 });

for (let z = 0; z <= TILE_MAX_Z; z++) {
  for (let x = 0; x < 2 ** z; x++) {
    for (let y = 0; y < 2 ** z; y++) {
      const tile = index.getTile(z, x, y);
      if (tile && tile.features.length > 0) {
        writeTile(z, x, y, tileToGeoJSON(tile));
      }
    }
  }
}
```

Decide `TILE_MAX_Z` from a size budget. z=4 (256 tiles) likely sufficient for an orthographic globe; z=5 (1024) gives finer culling.

### 2. Tile storage

Options:

- **Committed JSON tiles** in `data/tiles/{z}/{x}/{y}.json`. Pros: works offline, no fetch latency, browseable. Cons: many small files in git (10k–100k tiles for z=6). Prefer a flat manifest or a Vite-resolved `import.meta.glob('./tiles/**/*.json')`.
- **Single concatenated bundle** like `data/tiles/{z}.ts` — one `Record<\`${x}_${y}\`, FeatureCollection>` per zoom level. Solves the file-count problem; loses lazy per-tile loading (whole z-level loads at once). Reasonable for z ≤ 4.
- **Lazy fetch from a CDN / static dir** via `fetch('/tiles/{z}/{x}/{y}.json')`. Standard tile-server pattern. Best long-term but requires a deployment story.

**Recommendation**: start with per-z bundles (`data/tiles/{z}.ts`) for z ∈ [0, 4]. Code-split per z so app start only pays for z=0–2. Move to fetch-on-demand later if file size becomes a problem.

### 3. Runtime tile selection (`useTileSet`)

New hook at `src/hooks/useTileSet.ts`. Given a `viewport` (orthographic globe state: rotation, zoom, canvas size), returns the `FeatureCollection[]` of tiles to render.

Algorithm per frame (or per rotation-bucket):

1. Choose a zoom `z` from the globe's `zoom` value (existing LOD ladder logic).
2. For that `z`, iterate `[x, y]` tile coordinates. For each, compute the tile's lon/lat bbox.
3. Reject tiles whose bbox lies entirely outside the visible hemisphere (same bounding-circle test as `renderLayers` culling today).
4. Return the loaded `FeatureCollection`s of survivors; trigger dynamic-import for any that aren't loaded yet, keeping the previous frame's set on screen while loads complete.

The visible-hemisphere check can be a fast pre-filter: for each tile, take 4 bbox corners + centroid, test `d3.geoDistance(viewCenter, sample) < 90 + ε`; tile passes if any sample is inside.

### 4. Renderer adjustments

`Globe.Canvas` currently takes `topology: Topology`. With tiling we pass `features: FeatureCollection` (or `FeatureCollection[]`) instead. Two paths:

- **Bypass topology entirely**: a new `Globe.TiledCanvas` that takes the tile set and renders directly with `geoPath`. Cleaner separation.
- **Synthesise a topology**: convert the tile set into a transient `Topology` and reuse `createLayers`. Avoids forking the renderer but does extra conversion work each tile-set change.

**Recommendation**: new `Globe.TiledCanvas`. The existing `Globe.Canvas` is the topology-based path; `Globe.TiledCanvas` is the tile-based one. Both render to canvas via the same `renderLayers`. Story-wise, replace `EarthLOD` with `EarthTiled`.

### 5. Cache / lifecycle

- Module-level `Map<\`${z}/${x}/${y}\`, FeatureCollection>`mirrors the`topologyCache`pattern in`useTopology`.
- Tile loads are idempotent and cancellable (use the `disposed` flag pattern from `useTopology`).
- Optionally a LRU bound — at z=4 with 256 tiles × ~20 KB each ≈ 5 MB resident, fine to keep all in memory.

### 6. Stories + tests

- New `EarthTiled` story with `Globe.Debug` showing the loaded tile count and active zoom level.
- Unit test: `useTileSet` returns expected tile keys for a given view-center, zoom, and canvas size.

## File layout

```
packages/ui/react-ui-geo/
  data/
    raw/countries-10m.json                  (existing)
    tiles/
      manifest.ts                           (z-level metadata: bounds, tile count, generated-at)
      z0.ts  z1.ts  z2.ts  z3.ts  z4.ts     (one bundle per zoom)
  scripts/
    generate-tiles.mjs                      (new; runs in moon prebuild)
  src/
    hooks/
      useTileSet.ts                         (new)
    components/
      Globe/
        TiledCanvas.tsx                     (new; sibling of Globe.Canvas)
        EarthTiled.stories.tsx              (or in existing Globe.stories.tsx)
    util/
      tile-bounds.ts                        (lon/lat bbox + visible-hemisphere intersection)
```

## Tradeoffs

| Concern                | Impact                                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bundle size            | Per-z bundles let us code-split. z0–z2 (~70 tiles) loads with the app; z3, z4 lazy. Total ≈ same as 10m raw, distributed.                                                          |
| Shared-arc compactness | Lost — each tile re-encodes country boundaries as full GeoJSON. The size hit is offset by per-zoom simplification (`geojson-vt`'s `tolerance` knob).                               |
| Code complexity        | One new hook + a parallel canvas component. Existing topology path stays untouched.                                                                                                |
| Visual correctness     | `geojson-vt` clips features to tile bounds; adjacent tiles meet at the cut line. Strokes look continuous because every coastline point is on a tile boundary in at most two tiles. |
| Antimeridian / polar   | Web-Mercator tile scheme degenerates near the poles (y=0 covers > 85° lat). For an orthographic globe this is fine — Antarctica gets one or two tiles at z=4.                      |
| Build complexity       | New offline step. `geojson-vt` is JS-only, so the script runs in regular Node CI; no native deps. Equivalent to the existing `generate-countries.js`.                              |

## Expected perf

- Visible tiles at z=4 with orthographic projection: ~30 tiles (half the globe, ignoring polar degenerate cases).
- Each tile at `tolerance=3` carries maybe 2–5 k coordinates (vs. 10m raw's ~1 M total).
- Per-frame coord count under continuous rotation: ~60–150 k. d3-geo projection cost: ~25–60 ms. Frame rate: comfortably 30–60 fps at 10m-equivalent detail.

## Open questions

1. **Tile format**: JSON-per-tile vs. per-z bundle vs. fetch-on-demand. Decide before scripting (see step 2).
2. **Zoom mapping**: does the globe's `zoom` scalar map directly to a tile-pyramid `z`, or do we need a calibration curve? Probably the latter — the orthographic globe's "zoom" relates to angular extent, while tile z is a Mercator slippy-map concept.
3. **Tippecanoe later?** If JSON tile size becomes prohibitive (likely at z ≥ 5), switch to MVT/PBF via tippecanoe. Requires a tiny client-side MVT decoder (`@mapbox/vector-tile`).
4. **Cross-tile feature joins?** A country split across N tiles becomes N partial features. Hover/selection by country needs an `id` carried into each fragment. `geojson-vt` preserves properties; just confirm `id` survives.
5. **Pre-tile simplification per zoom**: `geojson-vt`'s `tolerance` is constant across z. For better quality we'd want lower-z tiles simplified more aggressively. Either run `topojson-simplify` on the source before tiling at each z, or accept the constant tolerance for v1.

## Out of scope (deliberately)

- WebGL / GPU rendering. Could come after tiling; orthogonal change.
- Web worker for projection. Marginal vs. tiling, more code.
- Server-side tile generation / dynamic tiles. We're a client-side library.
- 3D / texture-mapped sphere. Different product.
