# Boot Loader Swarm Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the boot loader's progress ring with a swarm-constellation animation around the Composer mark, per `agents/superpowers/specs/2026-08-10-boot-loader-swarm-animation-design.md`.

**Architecture:** A new pure DOM-free module `swarm.ts` (config bag + geometry/behavior math, unit-tested) plus a Solid `Swarm.tsx` component that binds it to SVG elements inside the existing rAF loop. `Loader.tsx` swaps its ring internals for `<Swarm>`; `store.ts`, `bridge.ts`, `mount.tsx`, and the vite plugin are untouched.

**Tech Stack:** Solid.js (already inlined in the loader bundle), SVG, vitest, storybook-solid (`*.solid-stories.tsx`).

## Global Constraints

- Work ONLY in this worktree on branch `claude/boot-loader-animation-86c185`; never create branches/worktrees (repo non-negotiable).
- No new dependencies; added minified payload budget ~3–4 KB.
- No casts to silence the type-checker; ES `#private`; no single-letter variable names (repo code style).
- Comments state *why* in one load-bearing clause (repo comment rule).
- All geometry in the swarm SVG's `0 0 400 300` viewBox; center `(200, 150)`.
- Normative constants (from the spec): ring radius 76, outer circle 136 (+0.55 rad spiral lead), no-go 60, settle ≈450 ms cubic-out, unsettle 300 ms, orbital rigid ring rotation 0.00015 rad/ms anticlockwise, wander amplitude 55, trails: 4 ghosts @ 45 ms, links: range 46 / max 40 transient, outro: ×(1 + 2.2·f) radial scale, shrink to 15% radius, ~600 ms smoothstep, brand colour `rgb(5,40,61)`, dot grey `rgb(64,64,64)` → docked grey `rgb(140,140,140)`, opacity 0.55 → 1.0.
- Variants: wander N=20 size 2.8 · orbit N=32 size 2.0 · trails N=48 size 1.6 · linked N=64 size 1.3.
- Anticlockwise everywhere (screen y is down ⇒ decreasing angle): dock order starts at 12 o'clock (`-π/2`) and decreases.
- The user owns port 9009 — serve any storybook on an alternate port (e.g. 9010).
- Single-file tests: `pnpm --filter @dxos/app-framework exec vitest run --project=node <file>` (a bare `moon run :test -- <file>` runs the whole suite). Run `pnpm install` at repo root first if `node_modules` is missing in this worktree.
- Format with `pnpm format` before every commit; never push unformatted.

---

### Task 1: `swarm.ts` — config + core geometry (pure, tested)

**Files:**
- Create: `packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/swarm.ts`
- Test: `packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/swarm.test.ts`

**Interfaces:**
- Consumes: nothing new (mirrors `store.ts` conventions).
- Produces (used by Tasks 2–4):

```ts
export type SwarmVariant = 'wander' | 'orbit' | 'trails' | 'linked';
export const SWARM_VARIANTS: readonly SwarmVariant[];
export type SwarmConfig = {
  variant: SwarmVariant;
  dotCount: number;
  dotSize: number;
  centerX: number;        // 200
  centerY: number;        // 150
  ringRadius: number;     // 76
  outerRadius: number;    // 136
  nogoRadius: number;     // 60
  spiralLead: number;     // 0.55
  settleMs: number;       // 450
  unsettleMs: number;     // 300
  ringRotationSpeed: number; // rad/ms; 0.00015 for 'orbit', 0 otherwise
  wanderAmplitude: number;   // 55
  ghostCount: number;        // 4
  ghostIntervalMs: number;   // 45
  linkRange: number;         // 46
  maxLinks: number;          // 40
  outroScale: number;        // 2.2
  outroMs: number;           // 600
};
export const defaultSwarmConfig: (variant: SwarmVariant) => SwarmConfig;
export const pickRandomVariant: (random?: () => number) => SwarmVariant;
export type SwarmDot = {
  angle: number;          // slot bearing, -π/2 - (i/N)·2π
  startX: number; startY: number;   // outer-circle entry position
  orbitRadius: number; orbitBearing: number; orbitSpeed: number;
  phase: number;          // per-dot noise seed
  settle: number;         // 0..1, stepped by stepSettle
  x: number; y: number;   // last rendered position (written by the component)
};
export const createDots: (config: SwarmConfig, random?: () => number) => SwarmDot[];
export const litCount: (config: SwarmConfig, progressPct: number) => number;
export const stepSettle: (config: SwarmConfig, dot: SwarmDot, index: number, lit: number, dtMs: number) => number; // returns eased settle (cubic-out)
export const slotPosition: (config: SwarmConfig, dot: SwarmDot, nowMs: number) => { x: number; y: number }; // honours ring rotation
export const projectNogo: (config: SwarmConfig, x: number, y: number) => { x: number; y: number };
export const easeOutCubic: (x: number) => number;
export const smoothstep: (x: number) => number;
export const dotFill: (settleEased: number, colorFactor: number) => string;
export const linkStroke: (colorFactor: number) => string;
export const outroFactor: (config: SwarmConfig, dismissingForMs: number | undefined) => number; // 0 before dismissal; smoothstep over outroMs
export const applyOutro: (config: SwarmConfig, x: number, y: number, outro: number) => { x: number; y: number; radiusScale: number; opacityScale: number };
```

- [ ] **Step 1: Ensure deps are installed**

Run: `ls node_modules/.bin/vitest || pnpm install` (repo root of this worktree).

- [ ] **Step 2: Write the failing test**

`swarm.test.ts` (colocated, same header/style as `store.test.ts` — vitest with `({ expect })` fixtures):

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  SWARM_VARIANTS,
  applyOutro,
  createDots,
  defaultSwarmConfig,
  dotFill,
  litCount,
  outroFactor,
  pickRandomVariant,
  projectNogo,
  slotPosition,
  stepSettle,
} from './swarm';

describe('defaultSwarmConfig', () => {
  test('per-variant dot counts and sizes match the spec', ({ expect }) => {
    expect(defaultSwarmConfig('wander')).toMatchObject({ dotCount: 20, dotSize: 2.8, ringRotationSpeed: 0 });
    expect(defaultSwarmConfig('orbit')).toMatchObject({ dotCount: 32, dotSize: 2.0, ringRotationSpeed: 0.00015 });
    expect(defaultSwarmConfig('trails')).toMatchObject({ dotCount: 48, dotSize: 1.6 });
    expect(defaultSwarmConfig('linked')).toMatchObject({ dotCount: 64, dotSize: 1.3 });
  });
});

describe('pickRandomVariant', () => {
  test('covers all four variants uniformly', ({ expect }) => {
    expect(pickRandomVariant(() => 0)).toBe(SWARM_VARIANTS[0]);
    expect(pickRandomVariant(() => 0.99)).toBe(SWARM_VARIANTS[3]);
  });
});

describe('createDots', () => {
  test('slots run anticlockwise from 12 o\'clock', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    const dots = createDots(config, () => 0.5);
    // Slot 0 at 12 o'clock; later slots decrease in angle (anticlockwise on screen).
    expect(dots[0].angle).toBeCloseTo(-Math.PI / 2);
    expect(dots[1].angle).toBeLessThan(dots[0].angle);
    // First slot position: directly above center at ring radius.
    const slot0 = slotPosition(config, dots[0], 0);
    expect(slot0.x).toBeCloseTo(config.centerX);
    expect(slot0.y).toBeCloseTo(config.centerY - config.ringRadius);
  });

  test('entry positions sit on the outer circle', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    for (const dot of createDots(config, () => 0.5)) {
      const radius = Math.hypot(dot.startX - config.centerX, dot.startY - config.centerY);
      expect(radius).toBeCloseTo(config.outerRadius);
    }
  });
});

describe('slotPosition', () => {
  test('is static for non-orbit variants and rigidly rotating for orbit', ({ expect }) => {
    const wander = defaultSwarmConfig('wander');
    const staticDot = createDots(wander, () => 0.5)[3];
    expect(slotPosition(wander, staticDot, 0)).toEqual(slotPosition(wander, staticDot, 5000));

    const orbit = defaultSwarmConfig('orbit');
    const dots = createDots(orbit, () => 0.5);
    const early = [slotPosition(orbit, dots[0], 1000), slotPosition(orbit, dots[7], 1000)];
    const late = [slotPosition(orbit, dots[0], 3000), slotPosition(orbit, dots[7], 3000)];
    // Slots moved…
    expect(Math.hypot(late[0].x - early[0].x, late[0].y - early[0].y)).toBeGreaterThan(0.1);
    // …but pairwise distance is preserved (rigid structure).
    const distance = (pair: { x: number; y: number }[]) => Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);
    expect(distance(late)).toBeCloseTo(distance(early), 5);
  });
});

describe('stepSettle', () => {
  test('docks immediately on its turn and never regresses while lit', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    const dot = createDots(config, () => 0.5)[0];
    expect(stepSettle(config, dot, 0, 0, 16)).toBe(0); // not lit: stays unsettled
    stepSettle(config, dot, 0, 1, config.settleMs); // lit: one full settle window
    expect(dot.settle).toBe(1);
    stepSettle(config, dot, 0, 1, 16);
    expect(dot.settle).toBe(1); // stays docked
  });
});

describe('litCount', () => {
  test('maps progress percent onto the dot count', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    expect(litCount(config, 0)).toBe(0);
    expect(litCount(config, 50)).toBeCloseTo(config.dotCount / 2);
    expect(litCount(config, 100)).toBe(config.dotCount);
  });
});

describe('projectNogo', () => {
  test('projects interior points to the rim and leaves exterior points alone', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    const inside = projectNogo(config, config.centerX + 10, config.centerY);
    expect(Math.hypot(inside.x - config.centerX, inside.y - config.centerY)).toBeCloseTo(config.nogoRadius);
    const outside = projectNogo(config, config.centerX + 200, config.centerY);
    expect(outside).toEqual({ x: config.centerX + 200, y: config.centerY });
  });
});

describe('dotFill', () => {
  test('grey while colourless, brand navy when docked and colourized', ({ expect }) => {
    expect(dotFill(0, 0)).toBe('rgb(64,64,64)');
    expect(dotFill(1, 0)).toBe('rgb(140,140,140)');
    expect(dotFill(1, 1)).toBe('rgb(5,40,61)');
  });
});

describe('outro', () => {
  test('outroFactor is 0 before dismissal and sweeps over outroMs', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    expect(outroFactor(config, undefined)).toBe(0);
    expect(outroFactor(config, 0)).toBe(0);
    expect(outroFactor(config, config.outroMs)).toBe(1);
  });

  test('applyOutro flings radially, shrinks toward 15%, and fades', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    const flung = applyOutro(config, config.centerX + config.ringRadius, config.centerY, 1);
    expect(flung.x).toBeCloseTo(config.centerX + config.ringRadius * (1 + config.outroScale));
    expect(flung.radiusScale).toBeCloseTo(0.15);
    expect(flung.opacityScale).toBeCloseTo(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @dxos/app-framework exec vitest run --project=node src/vite-plugin/boot-loader/loader-app/swarm.test.ts`
Expected: FAIL — cannot resolve `./swarm`.

- [ ] **Step 4: Implement `swarm.ts`**

Same copyright header as siblings. Key implementation notes (write real code, not these notes):

```ts
export const SWARM_VARIANTS = ['wander', 'orbit', 'trails', 'linked'] as const;
export type SwarmVariant = (typeof SWARM_VARIANTS)[number];

const BRAND_RGB = [5, 40, 61] as const;      // The mark's outer ring — the only brand colour used.
const GREY_LOOSE = 64;
const GREY_DOCKED = 140;
const LINK_GREY = 120;

const BASE: Omit<SwarmConfig, 'variant' | 'dotCount' | 'dotSize' | 'ringRotationSpeed'> = {
  centerX: 200, centerY: 150, ringRadius: 76, outerRadius: 136, nogoRadius: 60, spiralLead: 0.55,
  settleMs: 450, unsettleMs: 300, wanderAmplitude: 55, ghostCount: 4, ghostIntervalMs: 45,
  linkRange: 46, maxLinks: 40, outroScale: 2.2, outroMs: 600,
};

export const defaultSwarmConfig = (variant: SwarmVariant): SwarmConfig => {
  switch (variant) {
    case 'wander': return { ...BASE, variant, dotCount: 20, dotSize: 2.8, ringRotationSpeed: 0 };
    case 'orbit':  return { ...BASE, variant, dotCount: 32, dotSize: 2.0, ringRotationSpeed: 0.00015 };
    case 'trails': return { ...BASE, variant, dotCount: 48, dotSize: 1.6, ringRotationSpeed: 0 };
    case 'linked': return { ...BASE, variant, dotCount: 64, dotSize: 1.3, ringRotationSpeed: 0 };
  }
};

export const pickRandomVariant = (random: () => number = Math.random): SwarmVariant =>
  SWARM_VARIANTS[Math.min(SWARM_VARIANTS.length - 1, Math.floor(random() * SWARM_VARIANTS.length))];
```

- `createDots(config, random = Math.random)`: for `i` in `0..dotCount-1`: `angle = -π/2 - (i/dotCount)·2π`; `startX/Y = center + outerRadius·(cos|sin)(angle + spiralLead)`; `orbitRadius = nogoRadius + 14 + random()·(outerRadius - nogoRadius - 22)`; `orbitBearing = random()·2π`; `orbitSpeed = 0.00025 + random()·0.00035`; `phase = random()·2π`; `settle = 0`; `x = startX; y = startY`.
- `slotPosition`: `rotation = -nowMs · ringRotationSpeed` (0 for non-orbit ⇒ static); `center + ringRadius·(cos|sin)(dot.angle + rotation)`.
- `stepSettle`: mutates `dot.settle` toward 1 at `dtMs/settleMs` when `index < lit`, toward 0 at `dtMs/unsettleMs` otherwise, clamped to [0,1]; returns `easeOutCubic(dot.settle)`.
- `litCount = (progressPct / 100) · dotCount` (no rounding — fractional lit gives per-dot turns).
- `projectNogo`: if `hypot < nogoRadius`, scale the offset from center by `nogoRadius / max(hypot, 1e-6)`.
- `dotFill(settleEased, colorFactor)`: grey channel `g = lerp(64, 140, settleEased)`; each RGB channel `lerp(g, lerp(64, BRAND_RGB[c], settleEased), colorFactor)`, rounded; return `rgb(r,g,b)` with no spaces (tests compare exact strings).
- `linkStroke(colorFactor)`: channels `lerp(120, BRAND_RGB[c], colorFactor)`.
- `outroFactor(config, dismissingForMs)`: `undefined → 0`; else `smoothstep(clamp(dismissingForMs / outroMs, 0, 1))`.
- `applyOutro`: position scales radially from center by `1 + outro·outroScale`; `radiusScale = 1 - outro·0.85`; `opacityScale = 1 - outro`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @dxos/app-framework exec vitest run --project=node src/vite-plugin/boot-loader/loader-app/swarm.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/swarm.ts packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/swarm.test.ts
git commit -m "app-framework: boot loader swarm core geometry (pure, tested)"
```

---

### Task 2: `swarm.ts` — waiting behaviors (wander / orbit / trails / linked)

**Files:**
- Modify: `packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/swarm.ts`
- Test: `packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/swarm.test.ts` (append)

**Interfaces:**
- Consumes: Task 1's `SwarmConfig`, `SwarmDot`, `slotPosition`, `projectNogo`.
- Produces (used by Task 3):

```ts
/** Position of a dot at `nowMs` given its eased settle — variant motion blended toward the slot, no-go enforced. */
export const dotPosition: (config: SwarmConfig, dot: SwarmDot, settleEased: number, nowMs: number) => { x: number; y: number };
/** Pairs of unsettled-dot indices within linkRange, capped at maxLinks, with 0..1 closeness. */
export const transientLinks: (config: SwarmConfig, dots: SwarmDot[]) => { a: number; b: number; closeness: number }[];
/** True when adjacent docked dots i and i+1 (mod N) should draw a permanent ring link. */
export const ringLinkVisible: (dots: SwarmDot[], index: number) => boolean;
```

- [ ] **Step 1: Write the failing tests (append to `swarm.test.ts`)**

```ts
describe('dotPosition', () => {
  test('fully settled dot sits exactly on its slot', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    const dot = createDots(config, () => 0.5)[0];
    dot.settle = 1;
    const position = dotPosition(config, dot, 1, 1234);
    const slot = slotPosition(config, dot, 1234);
    expect(position.x).toBeCloseTo(slot.x);
    expect(position.y).toBeCloseTo(slot.y);
  });

  test('unsettled dots stay outside the no-go zone in every variant', ({ expect }) => {
    for (const variant of SWARM_VARIANTS) {
      const config = defaultSwarmConfig(variant);
      const dots = createDots(config, () => 0.99); // worst case: tight orbit radii
      for (let now = 0; now < 5000; now += 250) {
        for (const dot of dots) {
          const { x, y } = dotPosition(config, dot, 0, now);
          expect(Math.hypot(x - config.centerX, y - config.centerY)).toBeGreaterThanOrEqual(config.nogoRadius - 1e-6);
        }
      }
    }
  });

  test('orbit variant: settled dots track the rotating slot (never static)', ({ expect }) => {
    const config = defaultSwarmConfig('orbit');
    const dot = createDots(config, () => 0.5)[0];
    dot.settle = 1;
    const early = dotPosition(config, dot, 1, 1000);
    const late = dotPosition(config, dot, 1, 2000);
    expect(Math.hypot(late.x - early.x, late.y - early.y)).toBeGreaterThan(0.05);
  });
});

describe('transientLinks', () => {
  test('links only near, unsettled pairs and respects the cap', ({ expect }) => {
    const config = defaultSwarmConfig('linked');
    const dots = createDots(config, () => 0.5);
    // Cluster three dots, dock one of them, scatter the rest far away.
    dots.forEach((dot, index) => { dot.x = 1000 + index * 200; dot.y = 1000; dot.settle = 0; });
    dots[0].x = 100; dots[0].y = 100;
    dots[1].x = 110; dots[1].y = 100;
    dots[2].x = 105; dots[2].y = 108;
    dots[3].x = 102; dots[3].y = 95; dots[3].settle = 1; // docked: excluded
    const links = transientLinks(config, dots);
    const pairs = links.map(({ a, b }) => `${a}-${b}`);
    expect(pairs).toContain('0-1');
    expect(pairs).toContain('0-2');
    expect(pairs.some((pair) => pair.includes('3'))).toBe(false);
    expect(links.length).toBeLessThanOrEqual(config.maxLinks);
    for (const { closeness } of links) {
      expect(closeness).toBeGreaterThan(0);
      expect(closeness).toBeLessThanOrEqual(1);
    }
  });
});

describe('ringLinkVisible', () => {
  test('welds only when both adjacent dots are fully docked (wrapping)', ({ expect }) => {
    const config = defaultSwarmConfig('linked');
    const dots = createDots(config, () => 0.5);
    dots.forEach((dot) => (dot.settle = 1));
    dots[1].settle = 0.9;
    expect(ringLinkVisible(dots, 0)).toBe(false);      // 0–1: neighbour not fully docked
    expect(ringLinkVisible(dots, 1)).toBe(false);      // 1–2
    expect(ringLinkVisible(dots, 2)).toBe(true);       // 2–3
    expect(ringLinkVisible(dots, dots.length - 1)).toBe(true); // wraps to 0
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm --filter @dxos/app-framework exec vitest run --project=node src/vite-plugin/boot-loader/loader-app/swarm.test.ts`
Expected: FAIL — `dotPosition` etc. not exported.

- [ ] **Step 3: Implement the behaviors**

`dotPosition(config, dot, settleEased, nowMs)` — compute the variant's waiting position, lerp toward `slotPosition(config, dot, nowMs)` by `settleEased`, then `projectNogo`:

- `wander` / `linked`: waiting anchor = midpoint of `(startX, startY)` and the (rotation-free) slot; add damped sinusoidal drift — amplitude `wanderAmplitude · (1 - settleEased)`, offsets `sin(now/900 + phase·3)·amp + sin(now/331 + phase)·amp·0.3` (x) and `cos(now/1100 + phase·2)·amp + cos(now/411 + phase)·amp·0.3` (y).
- `orbit` / `trails`: waiting position = `center + (orbitRadius + wobble)·(cos|sin)(orbitBearing - now·orbitSpeed)` with `wobble = sin(now/700 + phase)·5·(1 - settleEased)` — decreasing bearing ⇒ anticlockwise.
- `transientLinks`: O(N²) over unsettled (`settle ≤ 0.5`) pairs using their last `x/y`; `closeness = 1 - distance/linkRange`; stop at `maxLinks`.
- `ringLinkVisible(dots, index)`: `dots[index].settle >= 1 && dots[(index + 1) % dots.length].settle >= 1`.

- [ ] **Step 4: Run tests to verify they pass**

Same command. Expected: PASS (whole file).

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/swarm.ts packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/swarm.test.ts
git commit -m "app-framework: swarm waiting behaviors (wander/orbit/trails/linked)"
```

---

### Task 3: `Swarm.tsx` component + `Loader.tsx` swap + CSS

**Files:**
- Create: `packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/Swarm.tsx`
- Modify: `packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/Loader.tsx`
- Modify: `packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/boot-loader.css`

**Interfaces:**
- Consumes: Task 1/2 exports; `LoaderStore` (`progress()`, `phase()`); `markSvg` string.
- Produces (used by Task 4):

```ts
export type SwarmProps = {
  store: LoaderStore;
  markSvg?: string;
  /** Storybook/testing overrides; production passes nothing and gets a random variant. */
  config?: Partial<SwarmConfig> & { variant?: SwarmVariant };
};
export const Swarm: Component<SwarmProps>;
// Loader.tsx: LoaderProps gains `swarm?: SwarmProps['config']` and renders <Swarm store markSvg config />.
```

- [ ] **Step 1: Implement `Swarm.tsx`**

Structure (one component, no test of its own — the math is tested; this is binding):

```tsx
export const Swarm: Component<SwarmProps> = (props) => {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const config: SwarmConfig = { ...defaultSwarmConfig(props.config?.variant ?? pickRandomVariant()), ...props.config };
  const dots = createDots(config);
  let fieldRef: SVGSVGElement | undefined;
  let hover = false;
  let colorFactor = 0;
  let dismissingSince: number | undefined;
  // Element pools created once on mount: dotCount circles; trails ⇒ dotCount·ghostCount ghost
  // circles (behind the dots); linked ⇒ maxLinks transient lines + dotCount ring lines (behind dots).
  ...
  onMount(() => { /* build pools, start rAF loop, register mouseenter/mouseleave on the field */ });
  onCleanup(() => cancelAnimationFrame(raf));
  return (
    <svg id='boot-loader-swarm' ref={fieldRef} viewBox='0 0 400 300' preserveAspectRatio='xMidYMid meet' aria-hidden='true'>
      <svg
        id='boot-loader-swarm-mark'
        x={200 - 42} y={150 - 42} width={84} height={84}
        classList={{ 'boot-loader-mark-color': /* colourized */ }}
        innerHTML={props.markSvg ?? ''}
      />
    </svg>
  );
};
```

rAF frame (mirrors the existing eased-progress pattern in `Loader.tsx`):

1. `dt = min(50, now - last)`; eased `shown += (store.progress() - shown) · 0.15` (snap within 0.05 — copy the existing loop's constants).
2. `phase = store.phase()`; when it first becomes `'dismissing'`, record `dismissingSince = now`; `outro = outroFactor(config, dismissingSince == null ? undefined : now - dismissingSince)`.
3. `wantColor = phase === 'dismissing' || hover`; ease `colorFactor` toward it at `dt/500`, clamped.
4. `lit = litCount(config, shown)`; per dot: `settleEased = reducedMotion ? (index < lit ? 1 : 0) : stepSettle(...)`; `position = reducedMotion ? slotPosition(config, dot, 0) : dotPosition(config, dot, settleEased, now)`; then `applyOutro` when `outro > 0` (reduced motion: skip fling, keep the fade via `opacityScale`).
5. Write `cx/cy/r/fill/opacity` on the pooled circles (`fill = dotFill(settleEased, colorFactor)`; `opacity = (0.55 + 0.45·settleEased) · opacityScale`; reduced-motion unlit dots get opacity 0 so progress reads as anticlockwise fade-in).
6. `trails`: every `ghostIntervalMs` shift each dot's ghost positions down and write the head; ghost opacity `(1 - settleEased) · 0.35 · (1 - ghostIndex/ghostCount)` (skip entirely under reduced motion).
7. `linked`: `transientLinks` → write pooled lines (`opacity = 0.25 · closeness`, zero the rest); ring links via `ringLinkVisible` with `opacity = 0.5 · max(0, 1 - outro · 2.5)`; stroke = `linkStroke(colorFactor)`.
8. Mark colour: toggle `boot-loader-mark-color` class when `wantColor` (CSS drives the filter transition).

- [ ] **Step 2: Swap `Loader.tsx` internals**

- Delete the arc machinery: `RING_RADIUS`, `RING_CENTER`, `MARKER_RADIUS`, the `arc()` function, the eased-`shown` signal and its rAF loop (moves into `Swarm`), the `#boot-loader-ring`/`#boot-loader-ring-head` SVGs, `#boot-loader-mark` div, and `isHostDriven`/`data-host-driven`.
- Keep: `readTranslateY`, the status-log FLIP effect, and the status DOM — untouched.
- New render: `<div id='boot-loader-disc'><Swarm store={props.store} markSvg={props.markSvg} config={props.swarm} /></div>` followed by the existing `#boot-loader-status` block. `LoaderProps` gains `swarm?: SwarmProps['config']`.

- [ ] **Step 3: CSS updates in `boot-loader.css`**

- `#boot-loader-disc`: widen to the full backdrop so the swarm has room — replace fixed `width/height: var(--boot-loader-disc-size)` with `inset: 0; position: absolute; width: auto; height: auto` (keep it as the grid wrapper), and drop the `translate(-50%,-50%)`-based centering plus the `data-dismissing` scale rule (the explode outro replaces it; the backdrop opacity fade stays).
- Delete: `#boot-loader-ring`, `#boot-loader-ring-head`, `.boot-loader-ring-progress`, `.boot-loader-ring-marker`, `#boot-loader-mark` blocks (incl. the conic mask) and the `--boot-loader-arc` machinery.
- Add:

```css
#boot-loader-swarm {
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* Mark greyscale until ready/hover; percentage keeps the transition interpolable (see old comment). */
#boot-loader-swarm-mark {
  filter: grayscale(100%);
  transition: filter 500ms ease-out;
}
#boot-loader-swarm-mark.boot-loader-mark-color {
  filter: grayscale(0%);
}
```

- Update the stale header comment (`BootLoader.solid-stories.tsx` guard) to name the story file Task 4 creates.
- NOTE (flag in the PR, do not "fix" silently): the mark now renders at 28% of the swarm field's min dimension (~250px on a 900px-tall window) vs the old `min(300px, 62.5vmin)` — the React `Placeholder` handoff has a size delta, masked by the explode outro + cross-fade. Revisit only if it looks wrong in the app.

- [ ] **Step 4: Type-check and test the package**

Run: `moon run app-framework:build` then `pnpm --filter @dxos/app-framework exec vitest run --project=node src/vite-plugin/boot-loader/loader-app/`
Expected: build green; store + swarm tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A packages/sdk/app-framework
git commit -m "app-framework: swap boot loader ring for swarm constellation"
```

---

### Task 4: Storybook — single story with variant + tunable args

**Files:**
- Create: `packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/BootLoader.solid-stories.tsx`

**Interfaces:**
- Consumes: `Loader`, `createLoaderStore`, `boot-loader.css`, `SwarmConfig`/`SWARM_VARIANTS` (Tasks 1–3).
- Produces: story `sdk/BootLoader` with args `{ variant: SwarmVariant | 'random', dotCount?, dotSize?, ringRotationSpeed?, ringRadius?, outerRadius?, nogoRadius?, settleMs?, outroMs? }`.

- [ ] **Step 1: Write the story (single DefaultStory + args — no per-story renderers)**

Follow `packages/ui/solid-ui-geo/.../Globe.solid-stories.tsx` for the `storybook-solidjs-vite` Meta/StoryObj shape. The story component:

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from 'storybook-solidjs-vite';
import { onCleanup, onMount } from 'solid-js';

import './boot-loader.css';
import { Loader } from './Loader';
import { createLoaderStore } from './store';
import { SWARM_VARIANTS, type SwarmConfig, type SwarmVariant } from './swarm';

type StoryProps = Partial<SwarmConfig> & { variant: SwarmVariant | 'random' };

const BootLoaderStory = (props: StoryProps) => {
  const store = createLoaderStore('Loading…');
  // Scripted boot: framework → 12 plugin range ticks → client → ready, on a repeating timeline.
  onMount(() => { /* setTimeout script driving store.pushStatus/setProgress/ready; loop by re-creating the store is NOT needed — one pass, then a manual restart via remount */ });
  onCleanup(() => store.dispose());
  const { variant, ...overrides } = props;
  return (
    <div id='boot-loader' style={{ position: 'fixed', inset: 0 }}>
      <Loader store={store} markSvg={undefined /* storybook has no brand asset; mark slot stays empty */}
        swarm={{ ...(variant === 'random' ? {} : { variant }), ...overrides }} />
    </div>
  );
};

const meta = {
  title: 'sdk/app-framework/BootLoader',
  render: (args: StoryProps) => <BootLoaderStory {...args} />,
  argTypes: {
    variant: { control: 'select', options: ['random', ...SWARM_VARIANTS] },
    dotCount: { control: { type: 'range', min: 8, max: 96, step: 1 } },
    dotSize: { control: { type: 'range', min: 0.5, max: 6, step: 0.1 } },
    ringRotationSpeed: { control: { type: 'range', min: 0, max: 0.0006, step: 0.00005 } },
    settleMs: { control: { type: 'range', min: 100, max: 2000, step: 50 } },
    outroMs: { control: { type: 'range', min: 200, max: 2000, step: 50 } },
  },
} satisfies Meta<StoryProps>;
export default meta;

export const Default: StoryObj<StoryProps> = { args: { variant: 'random' } };
```

For the boot script use the mockup's timeline scaled to real time: `progress` calls at 25% → (25 + k·55/12)% per plugin tick with `status({ humanized: 'Loading plugins', range: { index: k, total: 12 } })` → 94% ("Starting client…") → `ready()` at ~8 s. The scripted story must end with no open checklist items (repo memory: the plan reminder eats a scripted turn otherwise — not applicable here, but keep the script self-terminating).

- [ ] **Step 2: Serve and verify visually (alt port — 9009 belongs to the user)**

Run: `moon run storybook-solid:serve -- --port 9010` (background), open `http://localhost:9010` via the browser pane. Verify per variant (switch via controls): grey-until-ready, hover colour preview, anticlockwise docking, no dot over the mark, orbital rigid rotation, trails ghosts, linked chain closing, explode-and-shrink outro, and the status log FLIP still sliding. Check the browser console for errors. If `.cache/storybook` serves a stale dual-React/Solid bundle, clear it (repo memory).

- [ ] **Step 3: Commit**

```bash
git add packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/BootLoader.solid-stories.tsx
git commit -m "app-framework: boot loader storybook story with swarm controls"
```

---

### Task 5: Integration verification, changeset, PR update

**Files:**
- Create: `.changeset/<generated-name>.md`
- Verify (no edits expected): `packages/apps/composer-app/src/playwright/startup.spec.ts`, `packages/apps/composer-app/src/main.tsx`

- [ ] **Step 1: Playwright selector audit**

Run: `grep -n "boot-loader\|__bootLoader" packages/apps/composer-app/src/playwright/*.ts packages/apps/composer-app/src/main.tsx`
Confirm nothing references the removed ids (`#boot-loader-ring`, `#boot-loader-mark`, `--boot-loader-arc`, `data-host-driven`). If a spec or `main.tsx` does, update that reference to the swarm equivalents and include it in the commit.

- [ ] **Step 2: Composer smoke test**

Run: `moon run composer-app:build` (the bootLoaderPlugin bundles the loader app — this catches Solid/TS breakage in the inline bundle). Then compare the built loader chunk size against `main` (the plugin inlines into `index.html`; `ls -la` the build output or diff `index.html` sizes) — budget: +≤5 KB raw.

- [ ] **Step 3: Changeset**

Per `agents/instructions/changesets.md`: consumer-visible change to `@dxos/app-framework` (boot loader visuals) ⇒ patch bump:

```md
---
'@dxos/app-framework': patch
---

Boot loader: swarm constellation animation around the brand mark (four behaviors, random per boot, grey-until-ready, explode outro).
```

- [ ] **Step 4: Full gate + push**

```bash
pnpm format
moon run app-framework:lint -- --fix
moon run app-framework:test
git status
```

Account for EVERY modified/untracked file (including any user edits in the shared worktree — commit or explicitly confirm exclusion). Then commit, push, and update PR #12537's description with an implementation summary. Report CI status and the composer-preview URL from the sticky PR comment.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "app-framework: swarm boot loader — changeset + integration fixes"
git push
```

---

## Self-review notes

- Spec coverage: geometry/rules → T1; behaviors + rigid rotation → T2; grey-until-ready/hover/outro/reduced-motion/light-scheme (CSS greys inherit the existing light/dark custom-property pattern; dots use fixed greys that read on both, matching the approved mockups) → T3; single story + tunables → T4; payload budget, playwright audit, changeset → T5.
- The spec's "storybook can force a variant via prop" is `LoaderProps.swarm` (T3) consumed by the story (T4).
- Status log untouched (T3 explicitly keeps the FLIP block); store/bridge/mount/plugin untouched everywhere.
