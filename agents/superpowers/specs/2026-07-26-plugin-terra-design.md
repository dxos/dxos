# plugin-terra — Deterministic 3D Planet Renderer

Date: 2026-07-26
Status: Approved (design)

## Overview

`@dxos/plugin-terra` renders a deterministic, stylized 3D planet with the
Babylon.js engine. A `Terra` ECHO object holds the world metadata; a
`TerraArticle` surface renders the world.

Milestone 1 ships: seed-driven cubed-sphere terrain, a configurable global water
level (seas/lakes/rivers), flat-shaded biomes (beach / grass / forest / rock,
plus snow & ice caps and tree-line bands), and instanced scatter of a few
procedural tree and rock forms.

The camera is an orbiting mini-planet view now. The world data and mesh are
structured so a surface (flyover/walk) camera can be added later without rework.

### Non-photorealistic style

- Flat / faceted shading (per-face normals).
- No shadows (no shadow generators); a single `HemisphericLight` for flat ambient.
- `specularColor` black for a matte, semi-realistic look.
- Fog left as a documented hook (`scene.fogMode`) for a later milestone.

## Key decisions (from brainstorming)

- **Viewpoint:** orbiting mini-planet now, designed for a future surface camera.
- **Sphere mesh:** cubed-sphere (quadsphere) — 6 subdivided cube faces projected
  to the sphere; naturally splits into a per-face quadtree for future LOD.
- **MVP scope:** terrain + water + biomes + scatter details (phased internally).
- **Config UX:** live params panel (`react-ui-form`) bound to the object's
  config; editing regenerates the affected layer, debounced.

## Prior art / references (in-repo)

- `plugin-spacetime` — existing Babylon.js integration; source of the
  `SceneManager` pattern (Engine/Scene/`ArcRotateCamera`/`HemisphericLight`,
  theme-derived background). It uses `@babylonjs/core` from the catalog.
- `plugin-voxel` — modern plugin scaffold (containers with `.stories.tsx`,
  capabilities, `create-object`, `react-surface`, translations, `PLUGIN.mdl`).
- Cubed-sphere mapping + fBm 3D-noise displacement is the standard technique for
  seamless spherical terrain (sampling noise in 3D avoids UV seams).

## Package structure

Mirrors spacetime (Babylon `SceneManager`) + voxel (container/story/capability
layout).

```
packages/plugins/plugin-terra/
  package.json (private:true)  dx.config.ts  PLUGIN.mdl  moon.yml
  tsconfig.json  vite.config.ts
  src/
    meta.ts  plugin.ts  TerraPlugin.tsx  translations.ts  index.ts
    types/
      Terra.ts        # ECHO type + TerraConfig schema
      index.ts
    engine/           # pure, deterministic, unit-tested generator + renderer
      cubed-sphere.ts # base sphere geometry
      noise.ts        # seeded fBm simplex
      terrain.ts      # elevation/moisture sampling + displacement
      biomes.ts       # biome classification
      palette.ts      # biome -> color
      scatter.ts      # deterministic instance placement
      scene-manager.ts# Babylon engine/scene/camera/light + mesh assembly
      index.ts
    capabilities/
      create-object.ts
      react-surface.tsx
      index.ts
    containers/
      TerraArticle/{TerraArticle.tsx, TerraArticle.stories.tsx, index.ts}
    components/
      TerraForm/{TerraForm.tsx, TerraForm.stories.tsx, index.ts}
      index.ts
```

### Dependencies

- `@babylonjs/core` — `catalog:`
- `seedrandom` — `catalog:` (already present) + `@types/seedrandom` (catalog)
- `simplex-noise` — **add to catalog** (deterministic simplex noise, seeded via a
  provided PRNG)
- Standard DXOS set: `@dxos/app-framework`, `@dxos/app-toolkit`, `@dxos/echo`,
  `@dxos/echo-react`, `@dxos/effect`, `@dxos/react-ui-form`, `@dxos/util`,
  `@dxos/log`, `@dxos/plugin-space` (all `workspace:*`); peers `@dxos/react-ui`,
  `@dxos/ui-theme` as `workspace:^`.

New package sets `"private": true`.

## Data model

`Terra` ECHO object via `Type.makeObject`, DXN `org.dxos.type.terra.terra`
v0.1.0:

- `name?: string`
- `config: TerraConfig` — embedded schema struct; fields carry
  `FormInputAnnotation` so the live form renders automatically.

`TerraConfig` (grouped fields, all with sensible defaults so a bare seed yields a
good planet):

- **seed:** `seed: string`
- **terrain:** `elevationScale`, `frequency`, `octaves`, `persistence`,
  `lacunarity`, `resolution` (subdivisions per cube face)
- **water:** `waterLevel` (normalized 0–1 elevation of the sea surface)
- **climate:** `treeLine`, `snowLine`, `beachWidth` (thresholds)
- **scatter:** `treeDensity`, `rockDensity`, `trees` (bool), `rocks` (bool)

## Generation pipeline

Pure functions in `engine/`, fully deterministic from `seed` + config, so they
are unit-testable without Babylon.

1. **cubed-sphere** (`cubed-sphere.ts`): build 6 subdivided cube faces at
   `resolution`; normalize each vertex to the unit sphere. Shared-edge scheme so
   adjacent faces meet seamlessly.
2. **noise** (`noise.ts`): `simplex-noise` seeded via `seedrandom(seed)`; fBm
   using `octaves`/`persistence`/`lacunarity`, sampled at the 3D unit position —
   seamless across the whole sphere because sampling is in 3D (no UV seam).
3. **terrain** (`terrain.ts`): elevation channel displaces radius
   (`r = radius * (1 + elevation * elevationScale)`); a second noise channel is
   moisture; latitude derived from `y`.
4. **biomes** (`biomes.ts`): `classify(elevation, latitude, moisture)` →
   `ocean | beach | grass | forest | rock | snow`, using `waterLevel`,
   `beachWidth`, `treeLine`, `snowLine`.
5. **mesh** (`scene-manager.ts`): unindexed (per-face) geometry with per-face
   normals → flat shading; vertex colors from `palette.ts`.
6. **water:** a separate translucent sphere at the `waterLevel` radius, single
   flat color.
7. **scatter** (`scatter.ts`): on land faces between beach and tree-line,
   deterministically place Babylon **thin instances** of a few low-poly tree
   forms (cone/trunk variants) and rocks, aligned to the surface normal, density
   by biome. Placement is a hash of face index + seed (deterministic).

## Rendering

`scene-manager.ts`, adapted from `plugin-spacetime`:

- Babylon `Engine` + `Scene`.
- `ArcRotateCamera` for orbit/zoom.
- `HemisphericLight` only (flat ambient); **no shadow generators**.
- `specularColor` black (NPR/matte).
- Background color derived from the theme (as spacetime does).
- Config changes trigger a debounced regeneration of the affected layer.

## Config UX

`TerraForm` = a `react-ui-form` `Form` bound to `TerraConfig`, shown in the
article's complementary/side region. Edits write to the ECHO object; the article
observes the object and regenerates (debounced).

## Plugin wiring

`TerraPlugin.tsx` (mirrors spacetime):

- `AppPlugin.addSchemaModule({ schema: [Terra.Terra] })`
- `AppPlugin.addCreateObjectModule({ activate: CreateObject })`
- `AppPlugin.addSurfaceModule({ activate: ReactSurface })`
- `AppPlugin.addTranslationsModule({ translations })`
- `AppPlugin.addPluginAssetModule({ ... PLUGIN.mdl ... })`
- `plugin.ts` is the lazy entry (`Plugin.lazy`).
- `react-surface.tsx` filters `AppSurface.object(AppSurface.Article, Terra.Terra)`
  (and `Section`) → renders `TerraArticle`.

## Milestone-1 phasing (each phase independently testable)

- **P0 — Scaffold.** Package created; storybook renders a plain Babylon sphere.
  Build + lint green.
- **P1 — Terrain.** Cubed-sphere + fBm displacement; grayscale flat-shaded
  planet. Unit tests: determinism (same seed → identical mesh) + edge-seam
  continuity (adjacent-face shared edges agree).
- **P2 — Water + biomes.** Water shell at water level; biome classification +
  palette coloring (snow caps, tree-line bands, beaches).
- **P3 — Live params panel.** `TerraForm` bound to config with debounced regen.
- **P4 — Scatter.** Instanced trees (a few forms) + rocks by biome/density.
- **P5 — Wiring + polish.** Full plugin wiring (create-object, schema, surface,
  translations, PLUGIN.mdl), stories for each major component, ECHO create flow.

## Testing

- **Unit (vitest)** on `engine/` pure functions: same seed → identical mesh
  hash; adjacent-face shared edges agree (no seams); water/biome thresholds
  classify correctly.
- **Storybook-first** for `TerraArticle`, `TerraForm`, and a generator-preview
  story (per project convention of storybooks for major components).
- **Manual verify** via storybook + screenshot at each phase.

## Future (out of scope for milestone 1)

- Surface (flyover/walk) camera with per-face quadtree LOD and chunk streaming.
- Fog; rivers as flow lines; fields as ground-texture variation.
- More scatter variety and biome-specific vegetation.
