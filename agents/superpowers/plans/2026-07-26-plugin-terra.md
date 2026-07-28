# plugin-terra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@dxos/plugin-terra`, a Composer plugin that renders a deterministic, stylized 3D planet (Babylon.js) from a seed-driven `Terra` ECHO object, with a live parameter panel.

**Architecture:** Pure, deterministic, unit-tested generation in `src/engine/` (cubed-sphere geometry + seeded fBm noise → displaced triangle-soup mesh + biome colors + scatter placements), consumed by a Babylon `SceneManager` and a `TerraArticle` React container. Config lives on the ECHO object and is edited via in-scene `@babylonjs/gui` controls (plus an FPS widget); edits trigger debounced regeneration. (Plan change 2026-07-26: replaced the original react-ui-form panel.)

**Tech Stack:** TypeScript, Effect Schema, Babylon.js (`@babylonjs/core`), `simplex-noise` + `seedrandom`, React, `@dxos/react-ui*`, Vitest, Storybook, moon.

**Reference:** A validated throwaway spike lives at `agents/superpowers/specs/2026-07-26-plugin-terra-spike/` (`planet.ts` = generation, `main.ts` = Babylon scene). Engine tasks port from it. Spec: `agents/superpowers/specs/2026-07-26-plugin-terra-design.md`.

## Global Constraints

- **Branch safety:** never edit on `main`; work only in the assigned worktree.
- **New package is private:** `package.json` MUST set `"private": true`.
- **Workspace deps use `workspace:*`**; peer deps use `workspace:^`; external deps via catalog (`pnpm add --filter "<project>" --save-catalog "<package>"`).
- **No casts to silence the type-checker** (`as any`, `as unknown as T`, non-null `!`); `as const` is fine. Exception: the existing DXOS ECHO idiom `voxels ? (toVoxelMap(...) as any) : {}` is tolerated only where mirrored from `plugin-voxel`; prefer typed alternatives.
- **Comments state _why_** in one clause, ending with a period. Copyright header `//\n// Copyright 2026 DXOS.org\n//` at the top of every source file.
- **TypeScript, single quotes, named exports, arrow functions.** Import order: builtin → external → @dxos → internal (`#...`) → parent → sibling, blank line between groups.
- **Prefer ES `#private`** over `private` keyword. No single-letter variable names.
- **Namespace-export type modules** with `// @import-as-namespace` and `export * as Terra from './Terra'`.
- **Format before every commit:** `pnpm format` (oxfmt) and stage the result.
- **Test after every step.** Test one file: `moon run plugin-terra:test -- path/to/file.test.ts`.
- **Consumer-relevant change needs a changeset** before the PR (Task 13).

---

## File Structure

```
packages/plugins/plugin-terra/
  package.json           # private:true, deps, imports/exports (mirror plugin-voxel)
  dx.config.ts           # Config2.make plugin metadata
  PLUGIN.mdl             # plugin spec text (referenced as asset)
  moon.yml  tsconfig.json  vite.config.ts
  src/
    meta.ts  plugin.ts  TerraPlugin.tsx  translations.ts  index.ts  vite-env.d.ts
    types/
      Terra.ts           # Terra ECHO object + TerraConfig schema + make()
      index.ts           # export * as Terra
    engine/
      noise.ts           # makeSampler: seeded fBm elevation + moisture
      cubed-sphere.ts    # face basis + unit-sphere vertex mapping
      terrain.ts         # radiusAt (landGain displacement), latitude
      biomes.ts          # classify(elevation, latitude, moisture)
      palette.ts         # biome colors + depth-shaded ocean
      generate-planet.ts # assemble triangle-soup mesh + scatter (pure)
      scene-manager.ts   # Babylon engine/scene/camera/lights/mesh (impure)
      index.ts
    capabilities/
      create-object.ts  react-surface.tsx  index.ts
    containers/
      TerraArticle/{TerraArticle.tsx, TerraArticle.stories.tsx, index.ts}
      index.ts
    components/
      index.ts           # empty; config UI is in-scene (engine/scene-gui.ts)
```

Responsibilities: `engine/*` (except `scene-manager.ts`) is pure and Babylon-free so it is unit-testable. `scene-manager.ts` owns all Babylon calls. `types/Terra.ts` owns the schema. Containers/components own React. Capabilities own plugin wiring.

---

### Task 1: Scaffold the package

**Files:**

- Create: `packages/plugins/plugin-terra/package.json`
- Create: `packages/plugins/plugin-terra/dx.config.ts`
- Create: `packages/plugins/plugin-terra/PLUGIN.mdl`
- Create: `packages/plugins/plugin-terra/moon.yml`
- Create: `packages/plugins/plugin-terra/tsconfig.json`
- Create: `packages/plugins/plugin-terra/vite.config.ts`
- Create: `packages/plugins/plugin-terra/src/{meta.ts,plugin.ts,TerraPlugin.tsx,translations.ts,index.ts,vite-env.d.ts}`
- Modify: `pnpm-workspace.yaml` (add `simplex-noise` to catalog)

**Interfaces:**

- Produces: `TerraPlugin` (default export of `TerraPlugin.tsx`), `meta` (from `meta.ts`), `translations` (from `translations.ts`).

- [ ] **Step 1: Create `package.json`** (mirror `plugin-voxel/package.json`; set `"name": "@dxos/plugin-terra"`, `"private": true`, `"version": "0.1.0"`). Include `imports` for `#capabilities`, `#components`, `#containers`, `#meta`, `#plugin`, `#translations`, `#types` and `exports` for `.`, `./plugin`, `./translations` (copy the shapes from `plugin-spacetime/package.json`). Dependencies:

```jsonc
"dependencies": {
  "@babylonjs/core": "catalog:",
  "@dxos/app-framework": "workspace:*",
  "@dxos/app-toolkit": "workspace:*",
  "@dxos/compute": "workspace:*",
  "@dxos/echo": "workspace:*",
  "@dxos/echo-react": "workspace:*",
  "@dxos/effect": "workspace:*",
  "@dxos/log": "workspace:*",
  "@dxos/plugin-space": "workspace:*",
  "@dxos/react-ui": "workspace:*",
  "@dxos/react-ui-form": "workspace:*",
  "@dxos/util": "workspace:*",
  "effect": "catalog:",
  "seedrandom": "catalog:",
  "simplex-noise": "catalog:"
},
"devDependencies": {
  "@dxos/plugin-client": "workspace:*",
  "@dxos/plugin-testing": "workspace:*",
  "@dxos/react-client": "workspace:*",
  "@dxos/storybook-utils": "workspace:*",
  "@dxos/ui-theme": "workspace:*",
  "@types/react": "catalog:",
  "@types/react-dom": "catalog:",
  "@types/seedrandom": "catalog:",
  "react": "catalog:",
  "react-dom": "catalog:",
  "vite": "catalog:"
},
"peerDependencies": {
  "@dxos/react-ui": "workspace:^",
  "@dxos/ui-theme": "workspace:^",
  "effect": "catalog:",
  "react": "catalog:",
  "react-dom": "catalog:"
}
```

- [ ] **Step 2: Add `simplex-noise` to the catalog.** In `pnpm-workspace.yaml`, add under the alphabetized catalog list: `simplex-noise: ^4.0.3`. (`seedrandom`, `@types/seedrandom` already exist.)

- [ ] **Step 3: Create `dx.config.ts`, `moon.yml`, `tsconfig.json`, `vite.config.ts`** by copying `plugin-voxel`'s and adapting: plugin key `org.dxos.plugin.terra`, name `Terra`, icon `{ key: 'ph--globe-hemisphere-west--regular', hue: 'green' }`, tags `['labs']`, a 1-paragraph `description`. `vite.config.ts` entries: `index`, `TerraPlugin`, `capabilities`, `components`, `containers`, `meta`, `plugin`, `translations`, `types` (drop `skills`, `operations`). `tsconfig.json` references: keys, log, storybook-utils, util, compute, echo, echo-react, app-framework, app-toolkit, react-ui, react-ui-form, ui-theme, plugin-client, plugin-space, plugin-testing, plugin-theme.

- [ ] **Step 4: Create `src/meta.ts`, `src/plugin.ts`, `src/vite-env.d.ts`** (verbatim from `plugin-voxel`, replacing `Voxel`→`Terra`):

```ts
// meta.ts
import { Plugin } from '@dxos/app-framework';
import config from '../dx.config';
export const meta = Plugin.getMetaFromConfig(config);
```

```ts
// plugin.ts
import { Plugin } from '@dxos/app-framework';
import { meta } from './meta';
export const TerraPlugin = Plugin.lazy(meta, () => import('#plugin'));
```

`vite-env.d.ts`: copy from `plugin-voxel/src/vite-env.d.ts`.

- [ ] **Step 5: Create `src/translations.ts`** with the plugin namespace and object typename label:

```ts
//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: { 'plugin name': 'Terra' },
      // Object typename key filled in once Terra.Terra exists (Task 7).
    },
  },
];
```

- [ ] **Step 6: Create a placeholder `src/TerraPlugin.tsx`** so the package builds before capabilities exist:

```tsx
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { translations } from '#translations';

export const TerraPlugin = Plugin.define(meta).pipe(AppPlugin.addTranslationsModule({ translations }), Plugin.make);

export default TerraPlugin;
```

- [ ] **Step 7: Create `src/index.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './meta';
```

- [ ] **Step 8: Create `PLUGIN.mdl`** with a short markdown description of the plugin (2–3 sentences: seed-driven stylized 3D planet, land/water/biomes, live params).

- [ ] **Step 9: Install and build.**

Run:

```bash
pnpm install
moon run plugin-terra:build
```

Expected: install succeeds; build PASSES (empty-ish plugin compiles).

- [ ] **Step 10: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "plugin-terra: scaffold package"
```

---

### Task 2: Seeded fBm noise sampler

**Files:**

- Create: `packages/plugins/plugin-terra/src/engine/noise.ts`
- Test: `packages/plugins/plugin-terra/src/engine/noise.test.ts`

**Interfaces:**

- Produces:
  - `type Vec3 = readonly [number, number, number]`
  - `type NoiseConfig = { seed: string; frequency: number; octaves: number; persistence: number; lacunarity: number; continentPower: number; waterLevel: number; mountainScale: number; maskFrequency: number; maskThreshold: number }`
  - `makeSampler(config: NoiseConfig): { elevation(unit: Vec3): number; moisture(unit: Vec3): number }` — `moisture` returns `[0, 1]`; `elevation` returns `>= 0` and **may exceed 1** for mountain peaks (do not clamp).

- [ ] **Step 1: Write the failing test.**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { makeSampler, type NoiseConfig } from './noise';

const config: NoiseConfig = {
  seed: 'terra-1',
  frequency: 0.9,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2.0,
  continentPower: 1.35,
  waterLevel: 0.46,
  mountainScale: 0.5,
  maskFrequency: 0.9,
  maskThreshold: 0.42,
};

describe('noise', () => {
  test('is deterministic for a seed', () => {
    const a = makeSampler(config);
    const b = makeSampler(config);
    expect(a.elevation([0.1, 0.2, 0.97])).toBe(b.elevation([0.1, 0.2, 0.97]));
  });

  test('different seeds differ', () => {
    const a = makeSampler(config);
    const b = makeSampler({ ...config, seed: 'terra-2' });
    expect(a.elevation([0.1, 0.2, 0.97])).not.toBe(b.elevation([0.1, 0.2, 0.97]));
  });

  test('elevation is non-negative; moisture is in [0, 1]', () => {
    const { elevation, moisture } = makeSampler(config);
    for (const point of [
      [1, 0, 0],
      [0, 1, 0],
      [0.3, -0.4, 0.86],
    ] as const) {
      expect(elevation(point)).toBeGreaterThanOrEqual(0); // may exceed 1 for mountains.
      expect(moisture(point)).toBeGreaterThanOrEqual(0);
      expect(moisture(point)).toBeLessThanOrEqual(1);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `moon run plugin-terra:test -- src/engine/noise.test.ts`
Expected: FAIL (`makeSampler` not found).

- [ ] **Step 3: Implement `noise.ts`** by porting `makeSampler`, `Vec3`, `smoothstep` from the spike `planet.ts` (the `makeSampler` function with the `fbm`/`ridged`/`elevation`/`moisture` closures). Adaptations: add copyright header; export `Vec3` and `NoiseConfig`; four `createNoise3D(rng)` channels (elevation, moisture, mask, ridge) seeded via `seedrandom(config.seed)`. Elevation = `pow((fbm(elevation)+1)/2, continentPower)` (base continents) **plus** `belt * onLand * ridged(freq*3) * mountainScale` where `belt = smoothstep(maskThreshold, 1, (fbm(mask, maskFrequency)+1)/2)` and `onLand = smoothstep(waterLevel-0.02, waterLevel+0.12, base)`; **do not clamp the sum** (clamping causes plateaus). `moisture = (fbm(...,frequency*0.7)+1)/2`. Do not import Babylon.

- [ ] **Step 4: Run to verify it passes.**

Run: `moon run plugin-terra:test -- src/engine/noise.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/engine/noise.ts packages/plugins/plugin-terra/src/engine/noise.test.ts
git commit -m "plugin-terra: seeded fBm noise sampler"
```

---

### Task 3: Cubed-sphere geometry

**Files:**

- Create: `packages/plugins/plugin-terra/src/engine/cubed-sphere.ts`
- Test: `packages/plugins/plugin-terra/src/engine/cubed-sphere.test.ts`

**Interfaces:**

- Consumes: `Vec3` from `./noise`.
- Produces:
  - `const FACE_UPS: Vec3[]` (6 faces)
  - `faceBasis(up: Vec3): { axisA: Vec3; axisB: Vec3 }`
  - `unitOnFace(up: Vec3, axisA: Vec3, axisB: Vec3, i: number, j: number, resolution: number): Vec3` — normalized unit-sphere point for grid cell corner `(i, j)`.
  - vector helpers `normalize`, `sub`, `cross`, `dot`, `scale`, `add` (exported for reuse).

- [ ] **Step 1: Write the failing test.**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { FACE_UPS, faceBasis, normalize, unitOnFace } from './cubed-sphere';

describe('cubed-sphere', () => {
  test('has six faces', () => {
    expect(FACE_UPS).toHaveLength(6);
  });

  test('every generated vertex is on the unit sphere', () => {
    for (const up of FACE_UPS) {
      const { axisA, axisB } = faceBasis(up);
      for (let i = 0; i <= 4; i++) {
        for (let j = 0; j <= 4; j++) {
          const [x, y, z] = unitOnFace(up, axisA, axisB, i, j, 4);
          expect(Math.hypot(x, y, z)).toBeCloseTo(1, 6);
        }
      }
    }
  });

  test('adjacent faces meet seamlessly (shared edge points coincide)', () => {
    // +Y face right edge and +X face top edge share a cube edge; sampled points must match.
    const yUp = FACE_UPS[0];
    const xUp = FACE_UPS[2];
    const yBasis = faceBasis(yUp);
    const xBasis = faceBasis(xUp);
    // Corner shared by +Y and +X faces: cube corner (1,1,?) — assert at least one exact coincidence.
    const yCorner = unitOnFace(yUp, yBasis.axisA, yBasis.axisB, 4, 2, 4);
    const match = [0, 1, 2, 3, 4].some((k) => {
      const p = unitOnFace(xUp, xBasis.axisA, xBasis.axisB, 4, k, 4);
      return normalize(yCorner).every((v, idx) => Math.abs(v - p[idx]) < 1e-9);
    });
    expect(match).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `moon run plugin-terra:test -- src/engine/cubed-sphere.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `cubed-sphere.ts`** by porting from the spike `planet.ts`: the `FACE_UPS` array, the vector helpers (`normalize`, `sub`, `cross`, `dot`, `scale`), and the per-face `axisA`/`axisB`/`unitAt` logic — refactored into exported `faceBasis(up)` (returns `{ axisA: [up[1],up[2],up[0]], axisB: cross(up, axisA) }`) and `unitOnFace(up, axisA, axisB, i, j, resolution)` (the `unitAt` body). Add an `add` helper. Add copyright header.

- [ ] **Step 4: Run to verify it passes.** If the seam test's index mapping is off, adjust the sampled indices until a genuine shared cube-edge point coincides (the math is exact because both faces normalize the same cube point).

Run: `moon run plugin-terra:test -- src/engine/cubed-sphere.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/engine/cubed-sphere.ts packages/plugins/plugin-terra/src/engine/cubed-sphere.test.ts
git commit -m "plugin-terra: cubed-sphere geometry"
```

---

### Task 4: Terrain displacement

**Files:**

- Create: `packages/plugins/plugin-terra/src/engine/terrain.ts`
- Test: `packages/plugins/plugin-terra/src/engine/terrain.test.ts`

**Interfaces:**

- Consumes: `Vec3` from `./noise`.
- Produces:
  - `type TerrainConfig = { radius: number; elevationScale: number; waterLevel: number; landGain: number; oceanDepthBias: number }`
  - `radiusAt(config: TerrainConfig, elevation: number): number` — displaced radius.
  - `seaRadius(config: TerrainConfig): number` — radius of the sea surface.
  - `latitude(unit: Vec3): number` — `Math.abs(unit[1])` in `[0, 1]`.

- [ ] **Step 1: Write the failing test.**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { latitude, radiusAt, seaRadius, type TerrainConfig } from './terrain';

const config: TerrainConfig = {
  radius: 2,
  elevationScale: 0.16,
  waterLevel: 0.44,
  landGain: 2.8,
  oceanDepthBias: 0.6,
};

describe('terrain', () => {
  test('land rises above the sea surface', () => {
    const sea = seaRadius(config);
    expect(radiusAt(config, 0.7)).toBeGreaterThan(sea); // elevation > waterLevel
  });

  test('ocean floor sits below the sea surface', () => {
    const sea = seaRadius(config);
    expect(radiusAt(config, 0.2)).toBeLessThan(sea); // elevation < waterLevel
  });

  test('sea surface equals radiusAt(waterLevel)', () => {
    expect(radiusAt(config, config.waterLevel)).toBeCloseTo(seaRadius(config), 9);
  });

  test('latitude is 1 at the pole and 0 at the equator', () => {
    expect(latitude([0, 1, 0])).toBeCloseTo(1, 9);
    expect(latitude([1, 0, 0])).toBeCloseTo(0, 9);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `moon run plugin-terra:test -- src/engine/terrain.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `terrain.ts`.** Port the spike `radiusAt` closure into a pure function:

```ts
export const seaRadius = (config: TerrainConfig): number =>
  config.radius * (1 + config.waterLevel * config.elevationScale);

export const radiusAt = (config: TerrainConfig, elevation: number): number => {
  const rel = elevation - config.waterLevel;
  const shaped = config.waterLevel + (rel >= 0 ? rel * config.landGain : rel * config.oceanDepthBias);
  return config.radius * (1 + shaped * config.elevationScale);
};

export const latitude = (unit: Vec3): number => Math.abs(unit[1]);
```

- [ ] **Step 4: Run to verify it passes.**

Run: `moon run plugin-terra:test -- src/engine/terrain.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/engine/terrain.ts packages/plugins/plugin-terra/src/engine/terrain.test.ts
git commit -m "plugin-terra: terrain displacement"
```

---

### Task 5: Biomes and palette

**Files:**

- Create: `packages/plugins/plugin-terra/src/engine/biomes.ts`
- Create: `packages/plugins/plugin-terra/src/engine/palette.ts`
- Test: `packages/plugins/plugin-terra/src/engine/biomes.test.ts`

**Interfaces:**

- Consumes: `Vec3` from `./noise`.
- Produces (`biomes.ts`):
  - `type Biome = 'ocean' | 'beach' | 'grass' | 'forest' | 'rock' | 'snow'`
  - `type ClimateConfig = { waterLevel: number; beachWidth: number; treeLine: number; poles: boolean; snowLine: number; snowElevation: number }`
  - `classify(config: ClimateConfig, elevation: number, latitude: number, moisture: number): Biome`
- Produces (`palette.ts`):
  - `const palette: Record<Biome, Vec3>`
  - `oceanColor(elevation: number, waterLevel: number): Vec3`
  - `colorFor(biome: Biome, elevation: number, waterLevel: number): Vec3`

- [ ] **Step 1: Write the failing test.**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { classify, type ClimateConfig } from './biomes';
import { colorFor, oceanColor } from './palette';

const climate: ClimateConfig = {
  waterLevel: 0.44,
  beachWidth: 0.05,
  treeLine: 0.55,
  poles: false,
  snowLine: 0.82,
  snowElevation: 0.78,
};

describe('biomes', () => {
  test('below water level is ocean', () => {
    expect(classify(climate, 0.2, 0.1, 0.5)).toBe('ocean');
  });
  test('high latitude is snow only when poles enabled', () => {
    expect(classify(climate, 0.6, 0.9, 0.5)).not.toBe('snow'); // poles off.
    expect(classify({ ...climate, poles: true }, 0.6, 0.9, 0.5)).toBe('snow');
  });
  test('mountain-elevation snow applies regardless of poles', () => {
    expect(classify(climate, 0.95, 0.1, 0.5)).toBe('snow'); // rel > snowElevation.
  });
  test('just above water is beach', () => {
    expect(classify(climate, 0.46, 0.1, 0.5)).toBe('beach');
  });
  test('moist mid-elevation is forest, dry is grass', () => {
    expect(classify(climate, 0.6, 0.1, 0.8)).toBe('forest');
    expect(classify(climate, 0.6, 0.1, 0.2)).toBe('grass');
  });
  test('ocean color darkens with depth', () => {
    const shallow = oceanColor(0.43, 0.44);
    const deep = oceanColor(0.05, 0.44);
    expect(deep[2]).toBeLessThan(shallow[2]);
  });
  test('colorFor routes ocean through depth shading', () => {
    expect(colorFor('ocean', 0.1, 0.44)).toEqual(oceanColor(0.1, 0.44));
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `moon run plugin-terra:test -- src/engine/biomes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `biomes.ts` and `palette.ts`** by porting `classify`, `palette`, `SEA_SHALLOW`/`SEA_DEEP`/`oceanColor` from the spike `planet.ts`. In `classify`, gate the latitude ice-cap rule on `config.poles`: `if ((config.poles && latitude > config.snowLine) || rel > config.snowElevation) return 'snow';`. Add `colorFor(biome, elevation, waterLevel)` = `biome === 'ocean' ? oceanColor(elevation, waterLevel) : palette[biome]`. Add copyright headers.

- [ ] **Step 4: Run to verify it passes.**

Run: `moon run plugin-terra:test -- src/engine/biomes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/engine/biomes.ts packages/plugins/plugin-terra/src/engine/palette.ts packages/plugins/plugin-terra/src/engine/biomes.test.ts
git commit -m "plugin-terra: biomes and depth-shaded palette"
```

---

### Task 6: Planet assembly (mesh + scatter)

**Files:**

- Create: `packages/plugins/plugin-terra/src/engine/generate-planet.ts`
- Create: `packages/plugins/plugin-terra/src/engine/index.ts`
- Test: `packages/plugins/plugin-terra/src/engine/generate-planet.test.ts`

**Interfaces:**

- Consumes: all prior engine modules.
- Produces:
  - `type TerraConfigValues = NoiseConfig & TerrainConfig & ClimateConfig & { resolution: number; treeDensity: number; rockDensity: number; trees: boolean; rocks: boolean }`
  - `type PlanetMesh = { positions: Float32Array; normals: Float32Array; colors: Float32Array }`
  - `type Scatter = { position: Vec3; normal: Vec3; type: 'tree' | 'rock'; scale: number; variant: number; tint: number }`
  - `type Planet = { mesh: PlanetMesh; scatter: Scatter[]; seaRadius: number }`
  - `generatePlanet(config: TerraConfigValues): Planet`
- `engine/index.ts` re-exports all engine modules.

- [ ] **Step 1: Write the failing test.**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { generatePlanet, type TerraConfigValues } from './generate-planet';

const config: TerraConfigValues = {
  seed: 'terra-1',
  radius: 2,
  resolution: 8,
  elevationScale: 0.16,
  frequency: 0.9,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2.0,
  continentPower: 1.35,
  mountainScale: 0.5,
  maskFrequency: 0.9,
  maskThreshold: 0.42,
  waterLevel: 0.46,
  landGain: 2.5,
  oceanDepthBias: 0.6,
  beachWidth: 0.05,
  treeLine: 0.55,
  poles: false,
  snowLine: 0.82,
  snowElevation: 0.78,
  treeDensity: 0.28,
  rockDensity: 0.1,
  trees: true,
  rocks: true,
};

describe('generatePlanet', () => {
  test('emits the expected triangle count for six faces', () => {
    const { mesh } = generatePlanet(config);
    // 6 faces * resolution^2 quads * 2 tris * 3 verts * 3 components.
    expect(mesh.positions.length).toBe(6 * config.resolution * config.resolution * 2 * 3 * 3);
    expect(mesh.normals.length).toBe(mesh.positions.length);
    expect(mesh.colors.length).toBe((mesh.positions.length / 3) * 4);
  });

  test('is deterministic for a seed', () => {
    const a = generatePlanet(config);
    const b = generatePlanet(config);
    expect(Array.from(a.mesh.positions)).toEqual(Array.from(b.mesh.positions));
    expect(a.scatter.length).toBe(b.scatter.length);
  });

  test('scatter can be disabled', () => {
    const { scatter } = generatePlanet({ ...config, trees: false, rocks: false });
    expect(scatter).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `moon run plugin-terra:test -- src/engine/generate-planet.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `generate-planet.ts`** by porting the spike `generatePlanet` body. Adaptations: use `makeSampler` (Task 2), `faceBasis`/`unitOnFace`/vector helpers (Task 3), `radiusAt`/`seaRadius` (Task 4), `classify`/`colorFor` (Task 5). Keep `pushTri` computing outward normals and per-face color. Gate scatter on `config.trees`/`config.rocks`. Use `seedrandom(config.seed + ':scatter')` for placement. Return `Float32Array`s. **Do not import Babylon.** Then create `engine/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './noise';
export * from './cubed-sphere';
export * from './terrain';
export * from './biomes';
export * from './palette';
export * from './generate-planet';
export * from './scene-manager';
```

(Add the `scene-manager` export line in Task 8 when that file exists; until then omit it.)

- [ ] **Step 4: Run to verify it passes.**

Run: `moon run plugin-terra:test -- src/engine/generate-planet.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/engine
git commit -m "plugin-terra: planet mesh + scatter assembly"
```

---

### Task 7: Terra ECHO type + config schema

**Files:**

- Create: `packages/plugins/plugin-terra/src/types/Terra.ts`
- Create: `packages/plugins/plugin-terra/src/types/index.ts`
- Test: `packages/plugins/plugin-terra/src/types/Terra.test.ts`
- Modify: `packages/plugins/plugin-terra/src/index.ts` (add `export * from './types'`)
- Modify: `packages/plugins/plugin-terra/src/translations.ts` (add typename label)

**Interfaces:**

- Consumes: `TerraConfigValues` (structurally) from `engine/generate-planet`.
- Produces:
  - `Terra.TerraConfig` (Effect Schema struct) and `Terra.Terra` (ECHO object class with `name?`, `config`).
  - `Terra.make(props?): Terra` with `Terra.defaultConfig`.
  - `Terra.toConfigValues(terra: Terra): TerraConfigValues` — merges stored config over defaults for the engine.

- [ ] **Step 1: Write the failing test.**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { generatePlanet } from '../engine';
import { Terra } from './index';

describe('Terra', () => {
  test('make() applies defaults and a seed', () => {
    const terra = Terra.make({ name: 'World', config: { seed: 'abc' } });
    expect(terra.name).toBe('World');
    expect(terra.config.seed).toBe('abc');
    expect(terra.config.waterLevel).toBeGreaterThan(0);
  });

  test('toConfigValues produces a valid engine config', () => {
    const terra = Terra.make({ config: { seed: 'abc' } });
    const values = Terra.toConfigValues(terra);
    expect(() => generatePlanet({ ...values, resolution: 8 })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `moon run plugin-terra:test -- src/types/Terra.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `types/Terra.ts`** (mirror `plugin-spacetime/src/types/Scene.ts` for the `Type.makeObject` + `Obj.make` idiom, and `plugin-voxel/src/types/Voxel.ts` for annotations):

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

import { type TerraConfigValues } from '../engine';

/** Deterministic parameters for a Terra world. All fields optional so a bare seed works. */
export const TerraConfig = Schema.Struct({
  seed: Schema.optional(Schema.String),
  resolution: Schema.optional(Schema.Number),
  elevationScale: Schema.optional(Schema.Number),
  frequency: Schema.optional(Schema.Number),
  octaves: Schema.optional(Schema.Number),
  persistence: Schema.optional(Schema.Number),
  lacunarity: Schema.optional(Schema.Number),
  continentPower: Schema.optional(Schema.Number),
  mountainScale: Schema.optional(Schema.Number),
  maskFrequency: Schema.optional(Schema.Number),
  maskThreshold: Schema.optional(Schema.Number),
  waterLevel: Schema.optional(Schema.Number),
  landGain: Schema.optional(Schema.Number),
  oceanDepthBias: Schema.optional(Schema.Number),
  beachWidth: Schema.optional(Schema.Number),
  treeLine: Schema.optional(Schema.Number),
  poles: Schema.optional(Schema.Boolean),
  snowLine: Schema.optional(Schema.Number),
  snowElevation: Schema.optional(Schema.Number),
  treeDensity: Schema.optional(Schema.Number),
  rockDensity: Schema.optional(Schema.Number),
  trees: Schema.optional(Schema.Boolean),
  rocks: Schema.optional(Schema.Boolean),
});

export type TerraConfig = Schema.Schema.Type<typeof TerraConfig>;

export class Terra extends Type.makeObject<Terra>(DXN.make('org.dxos.type.terra', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    config: TerraConfig,
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--globe-hemisphere-west--regular', hue: 'green' }),
  ),
) {}

/** Default generation parameters (spike-validated). */
export const defaultConfig = (): Required<Omit<TerraConfigValues, 'seed'>> & { seed: string } => ({
  seed: 'terra',
  radius: 2,
  resolution: 256,
  elevationScale: 0.16,
  frequency: 0.9,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2.0,
  continentPower: 1.35,
  mountainScale: 0.5,
  maskFrequency: 0.9,
  maskThreshold: 0.42,
  waterLevel: 0.46,
  landGain: 2.5,
  oceanDepthBias: 0.6,
  beachWidth: 0.05,
  treeLine: 0.55,
  poles: false,
  snowLine: 0.82,
  snowElevation: 0.78,
  treeDensity: 0.28,
  rockDensity: 0.1,
  trees: true,
  rocks: true,
});

export const make = (props?: { name?: string; config?: Partial<TerraConfig> }): Terra =>
  Obj.make(Terra, { name: props?.name, config: { seed: 'terra', ...props?.config } });

/** Merge stored config over defaults to produce a complete engine config. `radius` is fixed. */
export const toConfigValues = (terra: Terra): TerraConfigValues => {
  const defaults = defaultConfig();
  const config = terra.config ?? {};
  return { ...defaults, ...Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined)) };
};
```

Note: `radius` is intentionally NOT in `TerraConfig` (fixed at 2 for the orbit view). Then create `types/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * as Terra from './Terra';
```

Add to `src/index.ts`: `export * from './types';`. Add to `translations.ts` under the `en-US` block: `[Type.getTypename(Terra.Terra)]: { 'typename label': 'Terra' }` (import `Terra` from `./types`).

- [ ] **Step 4: Run to verify it passes.**

Run: `moon run plugin-terra:test -- src/types/Terra.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/types packages/plugins/plugin-terra/src/index.ts packages/plugins/plugin-terra/src/translations.ts
git commit -m "plugin-terra: Terra ECHO type and config schema"
```

---

### Task 8: Babylon SceneManager

**Files:**

- Create: `packages/plugins/plugin-terra/src/engine/scene-manager.ts`
- Modify: `packages/plugins/plugin-terra/src/engine/index.ts` (add `export * from './scene-manager'`)

**Interfaces:**

- Consumes: `Planet`, `generatePlanet`, `TerraConfigValues` from the engine; `palette` from `./palette`.
- Produces:
  - `class SceneManager` with:
    - `constructor(canvas: HTMLCanvasElement)`
    - `render(planet: Planet): void` — (re)builds terrain + scatter meshes from a generated planet.
    - `setWaterSheen(enabled: boolean): void`
    - `dispose(): void`

- [ ] **Step 1: Implement `scene-manager.ts`** by porting the spike `main.ts` into a class (no HUD/DOM wiring). Requirements carried from the spike, each load-bearing:
  - Babylon imports from `@babylonjs/core/...` subpaths (as in the spike) plus `import '@babylonjs/core/Meshes/thinInstanceMesh'`.
  - `Engine` + `Scene`; `clearColor` from a passed-in/derived background (use a neutral dark for now; theme wiring is the container's concern later).
  - `ArcRotateCamera` with `lowerBetaLimit = null`/`upperBetaLimit = null` and `allowUpsideDown = true` (continuous rotation), `wheelPrecision`, radius limits, `minZ`.
  - Two `HemisphericLight`s (key + fill).
  - Shift-drag pan handler on the canvas (port from spike), stored so `dispose()` removes listeners.
  - `matte()` helper (specularColor black).
  - `render(planet)`: dispose previous meshes; build terrain `Mesh` via `VertexData` with **reversed winding** (`indices[t*3+1]=t*3+2; indices[t*3+2]=t*3+1;`), `useVertexColors`; build water sphere at `planet.seaRadius` (alpha 0.4, `needDepthPrePass = true`, `setEnabled(this.#waterSheen)`); build scatter thin instances bucketed by `(type, variant)` via `makeTreeBase`/`makeRockBase`/`orient` (port from spike).
  - `runRenderLoop` + resize listener in the constructor; `dispose()` stops the engine and removes listeners.

This file is impure (Babylon) and is validated via the storybook in Task 9, not a unit test.

- [ ] **Step 2: Add the export** to `engine/index.ts`: `export * from './scene-manager';`.

- [ ] **Step 3: Build to verify it compiles.**

Run: `moon run plugin-terra:build`
Expected: PASS (types resolve; no runtime check yet).

- [ ] **Step 4: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/engine/scene-manager.ts packages/plugins/plugin-terra/src/engine/index.ts
git commit -m "plugin-terra: Babylon scene manager"
```

---

### Task 9: TerraArticle container + storybook

**Files:**

- Create: `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx`
- Create: `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx`
- Create: `packages/plugins/plugin-terra/src/containers/TerraArticle/index.ts`
- Create: `packages/plugins/plugin-terra/src/containers/index.ts`

**Interfaces:**

- Consumes: `SceneManager`, `generatePlanet` from `#engine` (add `#engine` to `package.json` imports, or import via relative path `../../engine`); `Terra` from `#types`.
- Produces: `TerraArticle` React component: `AppSurface.ObjectArticleProps<Terra.Terra>`.

- [ ] **Step 1: Implement `TerraArticle.tsx`.** A canvas hosting `SceneManager`, regenerating on config change (debounced). Mirror `plugin-voxel`'s `VoxelArticle` structure (`Panel.Root`/`Panel.Content`):

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';

import { SceneManager, generatePlanet } from '../../engine';
import { Terra } from '#types';

export type TerraArticleProps = AppSurface.ObjectArticleProps<Terra.Terra>;

export const TerraArticle = ({ subject: terra }: TerraArticleProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const [config] = useObject(terra, 'config');

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    const manager = new SceneManager(canvasRef.current);
    managerRef.current = manager;
    return () => {
      manager.dispose();
      managerRef.current = null;
    };
  }, []);

  const values = useMemo(() => Terra.toConfigValues(terra), [config, terra]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }
    // Debounce regeneration so slider/form drags do not thrash the mesh builder.
    const handle = setTimeout(() => manager.render(generatePlanet(values)), 150);
    return () => clearTimeout(handle);
  }, [values]);

  return (
    <Panel.Root>
      <Panel.Content asChild>
        <div className='relative grow'>
          <canvas ref={canvasRef} className='absolute inset-0 is-full bs-full' style={{ touchAction: 'none' }} />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

TerraArticle.displayName = 'TerraArticle';
```

Create `TerraArticle/index.ts` (`export * from './TerraArticle';`) and `containers/index.ts` (`export * from './TerraArticle';`).

- [ ] **Step 2: Write `TerraArticle.stories.tsx`** (mirror `VoxelArticle.stories.tsx`):

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Terra } from '#types';

import { TerraArticle } from './TerraArticle';

const DefaultStory = ({ seed }: { seed?: string }) => {
  const terra = useMemo(() => Terra.make({ config: { seed: seed ?? 'terra-1', resolution: 128 } }), [seed]);
  return <TerraArticle subject={terra} attendableId='story' role='article' />;
};

const meta = {
  title: 'plugins/plugin-terra/containers/TerraArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
```

- [ ] **Step 3: Verify in Storybook.** Start (or reuse) the storybook server and open the story. Verify from BOTH a side and a **top-down** angle (winding/culling regression check): the planet is solid, land is opaque, oceans depth-shaded, snow caps present, orbit rotates continuously over poles, shift-drag pans.

Run: `moon run storybook-react:serve` (port 9009; if already running, reuse it) and open `plugins/plugin-terra/containers/TerraArticle`.
Expected: solid planet, no see-through from top-down, 60 fps.

- [ ] **Step 4: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/containers
git commit -m "plugin-terra: TerraArticle container + story"
```

---

### Task 10: Babylon GUI config controls + FPS widget

> Plan change (user directive 2026-07-26): the original react-ui-form `TerraForm`
> panel is REPLACED by in-scene `@babylonjs/gui` controls plus an FPS widget.

**Files:**

- Create: `packages/plugins/plugin-terra/src/engine/scene-gui.ts`
- Modify: `packages/plugins/plugin-terra/src/engine/index.ts` (export scene-gui)
- Modify: `packages/plugins/plugin-terra/package.json` (add `"@babylonjs/gui": "catalog:"`)
- Modify: `pnpm-workspace.yaml` (add `'@babylonjs/gui': ^7.52.5` to the catalog, alphabetized)
- Modify: `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx` (attach the GUI)

**Interfaces:**

- Consumes: `Scene`/`Engine` from `@babylonjs/core`; `TerraConfigValues` from `./generate-planet`; GUI controls from `@babylonjs/gui` (`AdvancedDynamicTexture`, `StackPanel`, `Slider`, `TextBlock`, `Checkbox`, `Control`).
- Produces: `class SceneGui`:
  - `constructor(options: { scene: Scene; engine: Engine; values: TerraConfigValues; onChange: (patch: SceneGuiPatch) => void; onWaterSheen: (enabled: boolean) => void })`
  - `type SceneGuiPatch = Partial<Pick<TerraConfigValues, 'waterLevel' | 'elevationScale' | 'mountainScale' | 'treeDensity' | 'resolution' | 'seed'>>`
  - `setValues(values: TerraConfigValues): void` — refresh control positions without firing `onChange`.
  - `dispose(): void`

- [ ] **Step 1: Add `@babylonjs/gui`.** Catalog entry `'@babylonjs/gui': ^7.52.5` in `pnpm-workspace.yaml` (alphabetized, matching `@babylonjs/core`'s range); `"@babylonjs/gui": "catalog:"` in the package's dependencies; `pnpm install`.

- [ ] **Step 2: Implement `scene-gui.ts`.** A fullscreen `AdvancedDynamicTexture` (`CreateFullscreenUI`) hosting:
  - A semi-transparent `StackPanel` docked top-right (`horizontalAlignment: RIGHT`, `verticalAlignment: TOP`, fixed width ~240px, padding) containing, each with a `TextBlock` label showing the live value:
    - `Slider` waterLevel (0.2–0.7, step 0.01)
    - `Slider` elevationScale (0.05–0.3, step 0.01)
    - `Slider` mountainScale (0–1.5, step 0.05)
    - `Slider` treeDensity (0–1, step 0.05)
    - `Slider` resolution (64–512, step 64)
    - `Checkbox` water sheen → calls `onWaterSheen` (render-only; not part of the config patch)
    - `Button` "reseed" → `onChange({ seed: \`terra-\${counterDerivedFromCurrentSeedOrIncrement}\` })`— implement as a simple numeric suffix increment from the current seed, falling back to`-1`.
  - Slider changes fire `onChange` with ONLY the changed key (the container debounces regeneration already).
  - An FPS `TextBlock` docked top-left, updated from `engine.getFps().toFixed(0)` on `scene.onAfterRenderObservable` (observer stored and removed in `dispose()`).
  - `setValues` updates slider values/labels with an internal `#updating` guard so programmatic sets do not fire `onChange`.
  - ES `#private` fields; `dispose()` removes the observer and disposes the ADT.

- [ ] **Step 3: Attach in `TerraArticle.tsx`.** After constructing `SceneManager`, construct `SceneGui` with the scene/engine (expose them from `SceneManager` via narrow readonly getters `get scene()` / `get engine()` — add these to `scene-manager.ts`), `values: Terra.toConfigValues(terra)`, `onChange` writing the patch into the ECHO object''s `config` (via the `useObject` updater), and `onWaterSheen: (enabled) => manager.setWaterSheen(enabled)`. Call `gui.setValues(values)` from the existing values-memo effect; dispose the GUI in the unmount cleanup (before the manager).

- [ ] **Step 4: Verify.** `/Users/burdon/.proto/shims/moon run plugin-terra:build && .../moon run plugin-terra:lint -- --fix && .../moon run plugin-terra:test` all green. Controller performs storybook visual verification (sliders regenerate the planet; FPS counter ticks; reseed works; water-sheen toggles).

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "plugin-terra: Babylon GUI config controls + FPS widget"
```

### Task 10b: react-ui Slider primitive + TerraForm panel (replaces Babylon GUI)

> Plan change (user directive 2026-07-26, supersedes Task 10): remove the
> `@babylonjs/gui` controls and drive config from a React panel built on
> `@dxos/react-ui-form`, backed by a NEW `Slider` primitive added to
> `@dxos/react-ui` (Radix-based, in the style of shadcn/MUI sliders). The FPS
> widget stays in-scene (it is a render-loop readout, not config).

**Files:**

- Create: `packages/ui/react-ui/src/components/Slider/Slider.tsx`
- Create: `packages/ui/react-ui/src/components/Slider/Slider.theme.ts`
- Create: `packages/ui/react-ui/src/components/Slider/Slider.stories.tsx`
- Create: `packages/ui/react-ui/src/components/Slider/index.ts`
- Modify: `packages/ui/react-ui/src/components/index.ts` (export Slider)
- Modify: `packages/ui/react-ui/src/theme/defaultTheme.ts` (register `slider: sliderTheme`)
- Modify: `packages/ui/react-ui/package.json` (add `"@radix-ui/react-slider": "catalog:"`)
- Modify: `pnpm-workspace.yaml` (add `'@radix-ui/react-slider'` to the catalog, alphabetized, matching the version range of the sibling `@radix-ui/react-*` entries)
- Create: `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx`
- Create: `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.stories.tsx`
- Create: `packages/plugins/plugin-terra/src/components/TerraForm/index.ts`
- Modify: `packages/plugins/plugin-terra/src/components/index.ts` (export TerraForm)
- Modify: `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx` (mount TerraForm; drop SceneGui config controls)
- Modify: `packages/plugins/plugin-terra/src/engine/scene-gui.ts` (reduce to the FPS widget only) and its export
- Modify: `packages/plugins/plugin-terra/package.json` (drop `@babylonjs/gui` ONLY if the FPS widget no longer needs it — see Step 4)

**Interfaces:**

- Consumes: `@radix-ui/react-slider`; `useThemeContext`/`ThemedClassName` from `@dxos/react-ui`; `Form` from `@dxos/react-ui-form`; `Terra.TerraConfig`.
- Produces:
  - `Slider` (react-ui): `ThemedClassName<SliderPrimitive.SliderProps>` forwardRef component rendering Root/Track/Range/Thumb, themed via `tx('slider.root'|'slider.track'|'slider.range'|'slider.thumb', ...)`; `sliderTheme: Theme<SliderStyleProps>` with `SliderStyleProps = { orientation?: 'horizontal' | 'vertical'; disabled?: boolean }`.
  - `TerraForm` (plugin-terra): `{ config: Terra.TerraConfig; onChange: (values: Terra.TerraConfig) => void }`.

- [ ] **Step 1: Add the Radix dep.** `'@radix-ui/react-slider'` in the `pnpm-workspace.yaml` catalog (alphabetized between `react-separator` and `react-slot`; use the same major/range style as its siblings) and `"@radix-ui/react-slider": "catalog:"` in `packages/ui/react-ui/package.json` dependencies. Run `pnpm install`.

- [ ] **Step 2: Implement the `Slider` primitive.** Follow the existing single-part primitive pattern exactly — read `packages/ui/react-ui/src/components/Separator/{Separator.tsx,Separator.theme.ts,index.ts}` first and mirror its structure (Radix import, `forwardRef`, `useThemeContext()` + `tx(...)`, `ThemedClassName`, `export type` + `export` at the bottom, copyright header).

`Slider.theme.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type SliderStyleProps = {
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
};

const root: ComponentFunction<SliderStyleProps> = ({ orientation, disabled }, ...etc) =>
  mx(
    'relative flex touch-none select-none items-center',
    orientation === 'vertical' ? 'h-full w-5 flex-col' : 'w-full h-5',
    disabled && 'opacity-50 pointer-events-none',
    ...etc,
  );

const track: ComponentFunction<SliderStyleProps> = ({ orientation }, ...etc) =>
  mx(
    'relative grow overflow-hidden rounded-full bg-input',
    orientation === 'vertical' ? 'w-1 h-full' : 'h-1 w-full',
    ...etc,
  );

const range: ComponentFunction<SliderStyleProps> = ({ orientation }, ...etc) =>
  mx('absolute bg-accentSurface', orientation === 'vertical' ? 'w-full' : 'h-full', ...etc);

const thumb: ComponentFunction<SliderStyleProps> = (_props, ...etc) =>
  mx(
    'block is-4 bs-4 rounded-full bg-baseSurface border border-separator shadow-sm transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentFocusIndicator',
    'hover:bg-hoverSurface',
    ...etc,
  );

export const sliderTheme: Theme<SliderStyleProps> = { root, track, range, thumb };
```

`Slider.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import * as SliderPrimitive from '@radix-ui/react-slider';
import React, { forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type SliderProps = ThemedClassName<SliderPrimitive.SliderProps>;

/** Range input built on the Radix slider primitive; supports one or more thumbs. */
const Slider = forwardRef<HTMLSpanElement, SliderProps>(
  ({ classNames, orientation = 'horizontal', disabled, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const styleProps = { orientation, disabled };
    const thumbCount = props.value?.length ?? props.defaultValue?.length ?? 1;
    return (
      <SliderPrimitive.Root
        {...props}
        orientation={orientation}
        disabled={disabled}
        className={tx('slider.root', styleProps, classNames)}
        ref={forwardedRef}
      >
        <SliderPrimitive.Track className={tx('slider.track', styleProps)}>
          <SliderPrimitive.Range className={tx('slider.range', styleProps)} />
        </SliderPrimitive.Track>
        {Array.from({ length: thumbCount }, (_unused, index) => (
          <SliderPrimitive.Thumb key={index} className={tx('slider.thumb', styleProps)} />
        ))}
      </SliderPrimitive.Root>
    );
  },
);

export type { SliderProps };

export { Slider };
```

`index.ts`: `export * from './Slider';` plus the copyright header. Add `export * from './Slider';` to `packages/ui/react-ui/src/components/index.ts` (alphabetical position). Register in `packages/ui/react-ui/src/theme/defaultTheme.ts`: import `sliderTheme` alongside the other theme imports and add `slider: sliderTheme,` to the theme object (alphabetical position). If `tx` keys are typed by a union/interface, add `slider` there too — grep for how `separator` is typed and mirror it.

- [ ] **Step 3: Story for the Slider.** `Slider.stories.tsx` mirroring an existing react-ui component story (read a sibling story in `packages/ui/react-ui/src/components/` for the exact decorator/meta idiom). Cover: default (uncontrolled), controlled with a value readout, `min`/`max`/`step`, `disabled`, vertical orientation, and a two-thumb range.

- [ ] **Step 4: Reduce `scene-gui.ts` to the FPS widget.** Delete the panel/sliders/checkbox/reseed and the `onChange`/`onWaterSheen`/`setValues` surface; keep the fullscreen ADT with only the top-left FPS `TextBlock` (observer stored, removed in `dispose()`), keeping `idealHeight = 1024`. Rename the class to `SceneFpsWidget` (constructor `{ scene, engine }`, plus `dispose()`), rename the file to `scene-fps.ts`, and update the `engine/index.ts` export and the article import. `@babylonjs/gui` REMAINS a dependency (the FPS widget still uses it) — do NOT remove it from `package.json`/catalog.

- [ ] **Step 5: Implement `TerraForm`.** A React panel bound to the config. Read `packages/ui/react-ui-form/src/...` (the `Form` component's actual props) plus a consumer such as `packages/plugins/plugin-spacetime` for the in-repo idiom BEFORE writing. Requirements:
  - Renders `Terra.TerraConfig` and calls `onChange` with changed values.
  - The five previously-GUI-controlled numeric fields (`waterLevel`, `elevationScale`, `mountainScale`, `treeDensity`, `resolution`) render as the new `Slider` with a live numeric readout and the ranges/steps from Task 10 (`waterLevel` 0.2–0.7/0.01, `elevationScale` 0.05–0.3/0.01, `mountainScale` 0–1.5/0.05, `treeDensity` 0–1/0.05, `resolution` 64–512/64). If `Form` supports per-field custom inputs (a custom-input registry / `inputs` prop keyed by property), use it; otherwise compose the sliders directly in `TerraForm` and use `Form` only for the remaining scalar/boolean fields. Report which approach the real `Form` API supports.
  - A `seed` text field and a "Reseed" `IconButton`/`Button` that increments a numeric suffix (fallback `-1`), matching Task 10's behavior.
  - A water-sheen toggle is NOT part of config — expose it as a separate prop callback `onWaterSheen?: (enabled: boolean) => void` rendered as a checkbox/switch in the panel.

- [ ] **Step 6: Mount in `TerraArticle`.** Render `TerraForm` inside the existing `<Panel.Toolbar />` region (or a right-side overlay panel above the canvas — pick one and keep the canvas `outline-none` + `Panel.Toolbar` structure the user hand-edited). Wire `onChange` to the existing `useObject` updater (`updateConfigRef.current((draft) => Object.assign(draft, patch))`) and `onWaterSheen` to `manager.setWaterSheen`. Keep the debounced 150ms regeneration effect unchanged. Remove the `SceneGui` config wiring, leaving the FPS widget construction.

- [ ] **Step 7: Story + verification.** Update/keep `TerraArticle.stories.tsx`; add `TerraForm.stories.tsx` (standalone panel with local state, ECHO object built via `useMemo` in a render function — never module-level). Then:

```bash
/Users/burdon/.proto/shims/moon run react-ui:build
/Users/burdon/.proto/shims/moon run react-ui:lint -- --fix
/Users/burdon/.proto/shims/moon run plugin-terra:build
/Users/burdon/.proto/shims/moon run plugin-terra:lint -- --fix
/Users/burdon/.proto/shims/moon run plugin-terra:test
```

All must be green. The controller performs storybook visual verification (slider drags regenerate the planet; FPS still ticks; reseed works).

- [ ] **Step 8: Commit.**

```bash
pnpm format
git add packages/ui/react-ui packages/plugins/plugin-terra pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "react-ui: add Slider primitive; plugin-terra: replace Babylon GUI with TerraForm"
```

---

### Task 11: Capabilities + plugin wiring

**Files:**

- Create: `packages/plugins/plugin-terra/src/capabilities/create-object.ts`
- Create: `packages/plugins/plugin-terra/src/capabilities/react-surface.tsx`
- Create: `packages/plugins/plugin-terra/src/capabilities/index.ts`
- Modify: `packages/plugins/plugin-terra/src/TerraPlugin.tsx`

**Interfaces:**

- Consumes: `Terra` from `#types`, `TerraArticle` from `#containers`.
- Produces: `CreateObject`, `ReactSurface` capabilities; fully wired `TerraPlugin`.

- [ ] **Step 1: Implement `create-object.ts`** (mirror `plugin-voxel/src/capabilities/create-object.ts`, replacing `Voxel.World`→`Terra.Terra`, `Voxel.make`→`Terra.make`).

- [ ] **Step 2: Implement `react-surface.tsx`** (mirror `plugin-spacetime/src/capabilities/react-surface.tsx`, filtering `AppSurface.object(AppSurface.Article, Terra.Terra)` and `Section`, rendering `<TerraArticle role={role} subject={data.subject} attendableId={data.attendableId} />`).

- [ ] **Step 3: Implement `capabilities/index.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
```

- [ ] **Step 4: Wire `TerraPlugin.tsx`** (mirror `plugin-voxel/src/VoxelPlugin.tsx`, minus skills/operations):

```tsx
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CreateObject, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Terra } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TerraPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addSchemaModule({ schema: [Terra.Terra] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default TerraPlugin;
```

- [ ] **Step 5: Build.**

Run: `moon run plugin-terra:build`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/capabilities packages/plugins/plugin-terra/src/TerraPlugin.tsx
git commit -m "plugin-terra: capabilities and plugin wiring"
```

---

### Task 12: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full package test suite.**

Run: `moon run plugin-terra:test`
Expected: all engine tests PASS.

- [ ] **Step 2: Run lint and build.**

Run: `moon run plugin-terra:lint -- --fix && moon run plugin-terra:build`
Expected: no lint errors; build PASS.

- [ ] **Step 3: Storybook regression.** Reopen both stories; verify top-down solidity, biomes, scatter, camera controls, and live-edit regeneration one more time. Capture a screenshot for the PR.

- [ ] **Step 4: Audit the diff** for casts, `!`, and narrative comments per Global Constraints; fix any.

- [ ] **Step 5: Commit any fixes.**

```bash
pnpm format
git add -A packages/plugins/plugin-terra
git commit -m "plugin-terra: verification fixes"
```

---

### Task 13: Changeset

**Files:**

- Create: `.changeset/<generated-name>.md`

- [ ] **Step 1: Add a changeset** (see `agents/instructions/changesets.md`). Since `@dxos/plugin-terra` is new and private, add a `patch` entry naming the app(s) that will register it if applicable; otherwise a minimal changeset for `@dxos/plugin-terra`.

```markdown
---
'@dxos/plugin-terra': patch
---

Add plugin-terra: deterministic stylized 3D planet renderer (Babylon.js).
```

- [ ] **Step 2: Commit.**

```bash
git add .changeset
git commit -m "plugin-terra: changeset"
```

---

## Self-Review

**Spec coverage:** Overview/style → Tasks 8–9 (flat shading, no shadows, matte, NPR). Cubed-sphere → Task 3. Seeded fBm → Task 2. `landGain`/`continentPower` displacement → Tasks 4, 7. Biomes + depth-shaded ocean → Tasks 5, 8. Data model (`Terra`/`TerraConfig`) → Task 7. Generation pipeline → Tasks 2–6, 8. Rendering (camera unclamped beta, shift-pan, two lights, reversed winding) → Task 8. Config UX (live form) → Task 10. Plugin wiring → Tasks 1, 11. Phasing P0–P5 → Tasks 1, (2–6), (5,8), 10, (6,8), 11. Testing (unit determinism/seam/thresholds + storybook + top-down manual) → Tasks 2–6, 9, 12. Future items (surface camera/LOD, fog, rivers) intentionally excluded.

**Placeholder scan:** engine bodies reference the checked-in spike source at a cited path with enumerated adaptations (not "similar to"); all NEW code (schema, wiring, containers, tests) is written out in full. No TBD/TODO left.

**Type consistency:** `TerraConfigValues` in Task 6 is `NoiseConfig & TerrainConfig & ClimateConfig & {resolution, treeDensity, rockDensity, trees, rocks}`; `Terra.toConfigValues` (Task 7) returns it; `generatePlanet` (Task 6) and `SceneManager.render` (Task 8) consume it. `radius`/`oceanDepthBias` live in defaults only (not in `TerraConfig` schema) — consistent across Tasks 4/6/7. `colorFor`, `classify`, `radiusAt`, `seaRadius`, `makeSampler`, `faceBasis`, `unitOnFace` names match across producer/consumer tasks.
