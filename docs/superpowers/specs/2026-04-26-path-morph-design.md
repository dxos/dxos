# PathMorph Component

## Summary

Add an experimental `PathMorph` component to `@dxos/react-ui-sfx` that morphs a circle ↔ six-pointed star in an infinite loop. Direct port of the [motion.dev path-morphing tutorial](https://motion.dev/tutorials/react-path-morphing) using `motion/react` and `flubber`.

## Scope

### In scope

- New `PathMorph.tsx` in `packages/ui/react-ui-sfx/src/components/experimental/`.
- `PathMorph.stories.tsx` next to it, titled under `ui/react-ui-sfx/experimental/PathMorph`.
- New workspace dependency: `flubber` added via `pnpm add --filter @dxos/react-ui-sfx --save-catalog flubber`.

### Out of scope

- Public package export (matches the existing `experimental/` convention — Blob, Ghost, Text are also storybook-only with no `index.ts`).
- Controls for number of star points, custom paths, or arbitrary shape morphing.
- Hover-to-pause, click-to-cycle, or other interactions.
- `prefers-reduced-motion` handling.
- Unit tests (presentational + animation-only; visual verification via storybook).

## Design

**Package:** `@dxos/react-ui-sfx`
**Files:**

- `src/components/experimental/PathMorph.tsx`
- `src/components/experimental/PathMorph.stories.tsx`

```tsx
//
// Copyright 2025 DXOS.org
//

import { interpolate } from 'flubber';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import React, { useEffect, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// Circle: cx=50, cy=50, r=40 expressed as four cubic-bezier arcs (handle = r · 0.5523).
const CIRCLE_PATH =
  'M50,10 C72.0914,10 90,27.9086 90,50 C90,72.0914 72.0914,90 50,90 C27.9086,90 10,72.0914 10,50 C10,27.9086 27.9086,10 50,10 Z';

/**
 * Builds an n-point star SVG path with alternating outer/inner radii around (cx, cy).
 * First vertex sits at the top (angle = -π/2) so it matches the circle's anchor at (50, 10).
 */
const buildStarPath = (cx: number, cy: number, outerR: number, innerR: number, points: number): string => {
  const cmds: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    cmds.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(3)},${y.toFixed(3)}`);
  }
  cmds.push('Z');
  return cmds.join(' ');
};

const STAR_PATH = buildStarPath(50, 50, 40, 18, 6);

export type PathMorphProps = ThemedClassName<{
  /** Pixel size of the rendered SVG (square). */
  size?: number;
  /** One-way morph duration in seconds. Full cycle is 2× this value. */
  duration?: number;
}>;

/**
 * Infinite circle ↔ six-point star morph.
 * Direct port of https://motion.dev/tutorials/react-path-morphing.
 */
export const PathMorph = ({ classNames, size = 100, duration = 2 }: PathMorphProps) => {
  const progress = useMotionValue(0);
  const interpolator = useMemo(() => interpolate(CIRCLE_PATH, STAR_PATH, { maxSegmentLength: 2 }), []);
  const path = useTransform(progress, (t) => interpolator(t));

  useEffect(() => {
    const controls = animate(progress, [0, 1, 0], {
      duration: duration * 2,
      ease: 'easeInOut',
      repeat: Infinity,
    });
    return () => controls.stop();
  }, [progress, duration]);

  return (
    <svg viewBox='0 0 100 100' width={size} height={size} className={mx(classNames)}>
      <motion.path d={path} fill='currentColor' />
    </svg>
  );
};
```

**Why these specific paths.** Both paths begin at the top-center vertex `(50, 10)` (angle = `-π/2`) and traverse clockwise. Flubber's `interpolate` matches segments by index and resamples to equalize point count via `maxSegmentLength: 2` — a small max-segment value keeps the interpolation visually smooth on a 100×100 viewport. Sharing the start point avoids an unsightly "rotation" during the morph.

**Star path is computed, not hand-rolled.** `buildStarPath(50, 50, 40, 18, 6)` produces the 12 vertices (6 outer at r=40, 6 inner at r=18) deterministically. This avoids drift between the spec's stated radii and the actual coordinates that a hand-typed path string would have.

**Why the function form of `useTransform`.** `useTransform(value, fn)` lets us call our memoized `flubber.interpolate(a, b)` directly, which already returns `(t) => string`. The alternative — `useTransform(value, [0, 1], [pathA, pathB], { mixer })` — relies on the `mixer` option name, which has historically varied across motion / framer-motion versions. The function form is unambiguous in motion v12.

**Animation cycle.** `animate(progress, [0, 1, 0], { duration: duration * 2, ease: 'easeInOut', repeat: Infinity })` drives `progress` through 0 → 1 → 0 over one cycle (default 4 s total: 2 s morphing to star, 2 s morphing back). `easeInOut` softens the dwell at each shape extreme.

**Cleanup.** The effect returns `controls.stop()` to halt the animation on unmount or when `duration` changes.

**Color.** `fill='currentColor'` inherits the consumer's text color. Themable via the standard Tailwind text utilities passed through `classNames`.

### Stories

```tsx
//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { PathMorph } from './PathMorph';

const meta = {
  title: 'ui/react-ui-sfx/experimental/PathMorph',
  component: PathMorph,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof PathMorph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { size: 160 },
};

export const Slow: Story = {
  args: { size: 160, duration: 4 },
};

export const Themed: Story = {
  args: { size: 160, classNames: 'text-sky-500 dark:text-sky-400' },
};
```

## Testing

Visual verification via Storybook only. Acceptance gate:

1. `moon run storybook-react:serve` — open `ui/react-ui-sfx/experimental/PathMorph`.
2. Confirm `Default` renders a circle morphing into a six-point star and back smoothly, no visible "snap" at the loop seam.
3. `Slow` is the same shape with a perceptibly slower cadence.
4. `Themed` is sky-blue.
5. `moon run react-ui-sfx:build` succeeds with `flubber` installed.

## Risks

- **Flubber types.** `flubber` ships either CommonJS-only or has no bundled types in some versions; the catalog add may need `@types/flubber` as a sibling devDependency. If the build fails on a missing type, add `@types/flubber` to the dev dependencies via `pnpm add --filter @dxos/react-ui-sfx --save-catalog --save-dev @types/flubber`. If types still don't resolve, declare `declare module 'flubber';` in `src/vite-env.d.ts`.
- **`motion/react` version.** The package catalog has `motion: ^12.0.6`. `useMotionValue` / `useTransform(value, fn)` / `animate` / `motion.path` are all stable in v12 — no compatibility concern. The function form of `useTransform` (rather than the array-output form with a `mixer` option) is used specifically to avoid version-specific option naming.
- **Viewbox + size mismatch.** `viewBox='0 0 100 100'` with `width=size` produces a 1:1 square; the consumer must respect aspect ratio if they override via `classNames`. Acceptable for an experimental component.
