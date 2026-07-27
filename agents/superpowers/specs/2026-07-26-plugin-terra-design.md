# plugin-terra — Deterministic 3D Planet Renderer

Date: 2026-07-26
Status: Approved (design) — validated by spike

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

## Spike findings (validated)

A throwaway Babylon + vite spike (reference code in
`2026-07-26-plugin-terra-spike/`) validated the whole approach and surfaced
several load-bearing details the implementation must carry over:

1. **Winding is left-handed.** Babylon is left-handed by default. A generator
   that computes triangle order with a standard right-handed cross product emits
   **back-facing** triangles, so backface culling removes the near hemisphere and
   you see straight through to the far side (looks like "translucent ground / only
   the back face is opaque"). Fix: reverse each triangle's winding when building
   the mesh (or set `material.sideOrientation`), keeping outward normals for
   lighting. **Always verify from a top-down angle — culling bugs are invisible
   from the side.**
2. **Do NOT render the sea as a full translucent sphere over the opaque planet.**
   A translucent dome tints emergent land at grazing angles and lets the far
   hemisphere bleed through. Instead bake a **depth-shaded ocean colour** into the
   opaque terrain (shallow → light teal, deep → dark navy); this reads as water
   clarity/depth with zero land tint. A literal translucent water overlay is an
   optional, **off-by-default** sheen.
3. **`landGain` is required.** Land must rise clearly above the waterline or it
   reads as submerged. Displacement shapes elevation as
   `waterLevel + (rel >= 0 ? rel*landGain : rel*oceanDepthBias)`. `continentPower`
   (a `pow` on raw elevation) biases the land/water ratio.
4. **Camera:** `ArcRotateCamera` with **unclamped beta**
   (`lower/upperBetaLimit = null`, `allowUpsideDown = true`) for continuous
   rotation over the poles, plus **shift-drag panning** of the target. Two
   `HemisphericLight`s (key + fill) give good flat ambient with no shadows.
5. **Scatter:** Babylon **thin instances** bucketed by `(type, variant)`; instance
   scale ≈ 0.05× planet radius; place only clearly above the beach line.
6. **Performance:** a single mesh at 512²/face ≈ 3.1M triangles held 60 fps;
   768² (~7M) still ran. `resolution` stays a config knob. This confirms one
   static mesh is fine for the orbit view and that the **future surface camera
   needs per-face LOD chunking**, not a bigger single mesh.
7. **Flat shading** via unindexed triangle-soup + per-face normals + per-face
   vertex colours works cleanly; scatter base meshes use `convertToFlatShadedMesh`.
8. Determinism confirmed (`simplex-noise` seeded by `seedrandom`); cubed-sphere
   edges meet seamlessly (verified in wireframe).
9. **Terrain realism:** plain fBm scatters peaks and makes small lakes. For a
   believable planet, use **low base frequency + `continentPower`** for large
   contiguous oceans/continents, and **clump mountains into ranges** with a
   belt mask × ridged noise. Latitude ice caps look artificial for many worlds —
   make them opt-in (`poles`, default off).

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
  `lacunarity`, `continentPower` (land/water bias), `resolution` (subdivisions per
  cube face)
- **mountains:** `mountainScale` (added relief in belts), `maskFrequency` (low →
  large, few belts), `maskThreshold` (higher → fewer/tighter belts)
- **water:** `waterLevel` (normalized 0–1 elevation of the sea surface),
  `landGain` (relief multiplier above the waterline — required so continents rise
  clearly)
- **climate:** `treeLine`, `snowLine`, `beachWidth` (thresholds), `poles` (bool —
  latitude ice caps, **default false**)
- **scatter:** `treeDensity`, `rockDensity`, `trees` (bool), `rocks` (bool)

Spike defaults that produced a good planet: `elevationScale ≈ 0.16`,
`frequency ≈ 0.9` (low → large oceans/continents), `continentPower ≈ 1.35`,
`waterLevel ≈ 0.46`, `landGain ≈ 2.5`, `mountainScale ≈ 0.5`,
`maskFrequency ≈ 0.9`, `maskThreshold ≈ 0.42`, `poles false`,
`resolution 128–512`.

## Generation pipeline

Pure functions in `engine/`, fully deterministic from `seed` + config, so they
are unit-testable without Babylon.

1. **cubed-sphere** (`cubed-sphere.ts`): build 6 subdivided cube faces at
   `resolution`; normalize each vertex to the unit sphere. Shared-edge scheme so
   adjacent faces meet seamlessly.
2. **noise** (`noise.ts`): `simplex-noise` seeded via `seedrandom(seed)`; fBm
   using `octaves`/`persistence`/`lacunarity`, sampled at the 3D unit position —
   seamless across the whole sphere because sampling is in 3D (no UV seam).
   Elevation = low-frequency continents (ocean-biased by `continentPower`) **plus
   clumped mountains**: a low-frequency `maskFrequency`/`maskThreshold` belt mask ×
   **ridged** multifractal detail × `mountainScale`, gated to land. **Do not clamp
   elevation to 1** — clamping flattens tall peaks into plateaus; let mountains
   exceed 1 and let displacement/thresholds handle the extended range.
3. **terrain** (`terrain.ts`): displace radius with land clearly above the
   waterline —
   `r = radius * (1 + (waterLevel + (rel >= 0 ? rel*landGain : rel*oceanDepthBias)) * elevationScale)`
   where `rel = elevation - waterLevel`; a second noise channel is moisture;
   latitude derived from `y`.
4. **biomes** (`biomes.ts`): `classify(elevation, latitude, moisture)` →
   `ocean | beach | grass | forest | rock | snow`, using `waterLevel`,
   `beachWidth`, `treeLine`, `snowLine`. Mountain (elevation) snow always applies;
   latitude ice caps apply only when `poles` is enabled. Ocean colour is
   **depth-shaded** (shallow → light teal, deep → dark navy) so opaque water reads
   as water.
5. **mesh** (`scene-manager.ts`): unindexed (per-face) geometry with per-face
   normals → flat shading; per-face vertex colours from `palette.ts` /
   depth-shaded ocean. **Reverse triangle winding for Babylon's left-handed
   convention** (or set `sideOrientation`) so outer faces survive backface culling.
6. **water (optional overlay):** the sea is primarily the depth-shaded opaque
   terrain (no land tint, never see-through). A literal translucent water sphere
   is an **optional off-by-default** sheen; only enable with care (tints land at
   grazing angles).
7. **scatter** (`scatter.ts`): on land faces above the beach line and below
   tree-line, deterministically place Babylon **thin instances** of a few low-poly
   tree forms (cone/trunk variants) and rocks (scale ≈ 0.05× radius), aligned to
   the surface normal, density by biome. Placement is a hash of face index + seed
   (deterministic).

## Rendering

`scene-manager.ts`, adapted from `plugin-spacetime`:

- Babylon `Engine` + `Scene`.
- `ArcRotateCamera` for orbit/zoom, with **unclamped beta** + `allowUpsideDown`
  for continuous rotation over the poles, and **shift-drag panning** of the target.
- Two `HemisphericLight`s (key + fill) for flat ambient; **no shadow generators**.
- `specularColor` black (NPR/matte).
- Terrain material `useVertexColors`; **reversed winding** (see generation step 5).
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
- **P2 — Water + biomes.** Depth-shaded ocean baked into terrain; biome
  classification + palette coloring (snow caps, tree-line bands, beaches).
  Optional off-by-default translucent sheen.
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
- **Manual verify** via storybook + screenshot at each phase, **including a
  top-down angle** (where winding/culling bugs are visible but side views hide
  them).

## Future (out of scope for milestone 1)

- Surface (flyover/walk) camera with per-face quadtree LOD and chunk streaming.
- Fog; rivers as flow lines; fields as ground-texture variation.
- More scatter variety and biome-specific vegetation.

### Tracked backlog

- **Light source (sun):** a directional "sun" light (position/angle, optional
  day–night), replacing/augmenting the flat hemispheric ambient. Would introduce
  directional shading — reconcile with the current no-shadow NPR style.
- **Landing points for rockets:** designated surface landing sites/markers on the
  planet (placement, selection, per-site metadata).
- **Boats and submarines:** water-borne/underwater craft on the seas — surface
  navigation and submerged movement over the depth-shaded ocean.
- **Satellites:** orbiting bodies around the planet (orbital paths, moons/craft
  above the surface).
