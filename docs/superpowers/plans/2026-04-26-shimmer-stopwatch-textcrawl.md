# Shimmer, Stopwatch, and TextCrawl Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two experimental React components (`Shimmer`, `Stopwatch`) to `@dxos/react-ui-components` plus low-risk improvements to the existing `TextCrawl`, all inspired by the timer / "thinking" affordances at the bottom of Claude desktop's code editor.

**Architecture:** Pure presentational components. Shimmer is a single span wrapped by a CSS-only `mask-image` shimmer (`@utility shimmer-text` + `@keyframes shimmer-text` in the shared theme). Stopwatch is a single render-tree element with a self-rescheduling `setTimeout` aligned to the next second boundary, a pure `formatElapsed` helper, and a default halo-pulse icon. TextCrawl gets behavior-preserving cleanups only (`prefers-reduced-motion` honoring, magic-number extraction, TODO removal).

**Tech Stack:** React 19, TypeScript, Tailwind v4 with CSS-first config (`@theme`, `@utility`), vitest, Storybook 9, moon for builds.

**Spec:** [docs/superpowers/specs/2026-04-26-shimmer-stopwatch-textcrawl-design.md](../specs/2026-04-26-shimmer-stopwatch-textcrawl-design.md)

**Conventions to honor (from CLAUDE.md):**
- All `.ts`/`.tsx` files start with `// Copyright 2025 DXOS.org //` header (3-line comment block).
- Single quotes, arrow function components, named React imports (`useState`, not `React.useState`).
- `forwardRef` variable name is `forwardedRef`.
- Prefer ES `#private` over TypeScript `private` in new code.
- Test files use vitest `describe`/`test` (not `it`), prefer `test('foo', ({ expect }) => …)`.
- Tests live next to modules as `module.test.ts`.
- All comments end with a period.
- No new exports beyond what the spec requires.

---

## Chunk 1: CSS scaffolding

This chunk adds the `shimmer-text` keyframe + utility plus the global reduced-motion fallback. No React yet — the goal is a working CSS surface that the Shimmer component will lean on, and that doesn't break the existing build.

### Task 1.1: Add `@keyframes shimmer-text` to animation.css

**Files:**
- Modify: `packages/ui/ui-theme/src/css/theme/animation.css` (append at end of file, after closing `}` of `@theme` block)

- [ ] **Step 1: Read the current file**

Read `packages/ui/ui-theme/src/css/theme/animation.css`. Confirm the file ends with `}` (the closing brace of the single `@theme` block at line 229).

- [ ] **Step 2: Append the keyframe block**

Append the following block immediately after the closing `}` of the `@theme` block. Place a blank line before it for readability:

```css

/**
 * Shimmer (text)
 * Sweeps a brighter band across text via mask alpha — preserves the consumer's color.
 * Translates exactly one tile period (2× element width) per cycle so the loop seam is invisible.
 */
@keyframes shimmer-text {
  from {
    mask-position-x: 100%;
    -webkit-mask-position-x: 100%;
  }
  to {
    mask-position-x: -100%;
    -webkit-mask-position-x: -100%;
  }
}
```

- [ ] **Step 3: Verify the package still builds**

Run: `moon run ui-theme:build`
Expected: success, no CSS parse errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/ui-theme/src/css/theme/animation.css
git commit -m "feat(ui-theme): add shimmer-text keyframe"
```

### Task 1.2: Add the global reduced-motion fallback to animation.css

**Files:**
- Modify: `packages/ui/ui-theme/src/css/theme/animation.css` (append after the `@keyframes shimmer-text` block from Task 1.1)

- [ ] **Step 1: Append the reduced-motion media block**

After the `@keyframes shimmer-text` block, append:

```css

/**
 * Honor user reduced-motion preference for decorative animations.
 * Functional transitions (fade/slide/toast/blink) are intentionally excluded —
 * suppressing them would hide UI state changes.
 */
@media (prefers-reduced-motion: reduce) {
  .animate-halo-pulse,
  .animate-spin-slow,
  .animate-trail,
  .animate-trail-offset,
  .animate-shimmer {
    animation: none;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `moon run ui-theme:build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/ui-theme/src/css/theme/animation.css
git commit -m "feat(ui-theme): honor prefers-reduced-motion for decorative animations"
```

### Task 1.3: Add `@utility shimmer-text` and its reduced-motion fallback to utilities.css

**Files:**
- Modify: `packages/ui/ui-theme/src/css/utilities.css` (append at end of file)

- [ ] **Step 1: Read the current file**

Read `packages/ui/ui-theme/src/css/utilities.css`. Confirm the existing pattern is top-level `@utility dx-* { … }` blocks (lines 29 onward).

- [ ] **Step 2: Append the new utility and fallback**

Append at the very end of the file:

```css

/**
 * Shimmer text — animates opacity left → right across the contained text.
 * See @keyframes shimmer-text in theme/animation.css for the keyframe definition.
 * Geometry: mask-size 200% 100% with mask-repeat: repeat-x means each tile is
 * 2× the element width; the keyframe slides mask-position-x by 200% (one full
 * tile period), giving a seamless loop. The 5-stop gradient (0.4 → 1.0 → 0.4)
 * produces a single bright pulse per cycle that traverses left → right during
 * the first half, with a brief calm interval during the second half.
 */
@utility shimmer-text {
  mask-image: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.4) 0%,
    rgba(0, 0, 0, 0.4) 30%,
    rgba(0, 0, 0, 1) 50%,
    rgba(0, 0, 0, 0.4) 70%,
    rgba(0, 0, 0, 0.4) 100%
  );
  -webkit-mask-image: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.4) 0%,
    rgba(0, 0, 0, 0.4) 30%,
    rgba(0, 0, 0, 1) 50%,
    rgba(0, 0, 0, 0.4) 70%,
    rgba(0, 0, 0, 0.4) 100%
  );
  mask-size: 200% 100%;
  -webkit-mask-size: 200% 100%;
  mask-repeat: repeat-x;
  -webkit-mask-repeat: repeat-x;
  animation: shimmer-text 2s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .shimmer-text {
    animation: none;
    mask-image: none;
    -webkit-mask-image: none;
    opacity: 0.6;
  }
}
```

- [ ] **Step 3: Verify build**

Run: `moon run ui-theme:build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/ui-theme/src/css/utilities.css
git commit -m "feat(ui-theme): add shimmer-text utility for opacity-sweep text effect"
```

### Task 1.4: Smoke-test the CSS in Storybook

**Files:** none (read-only check)

- [ ] **Step 1: Build dependent packages**

Run: `moon run react-ui-components:build`
Expected: success.

- [ ] **Step 2: Start storybook**

Run: `moon run react-ui-components:storybook` (or `moon run storybook-react:serve` per CLAUDE.md). Leave it running in the background for the rest of the chunks; tear down only when the whole plan is done.
Expected: dev server starts without errors. We're not opening any story yet — this is just confirming the CSS edits don't break the Tailwind v4 pipeline.

- [ ] **Step 3: If the build fails**

Apply the **rollback path** documented in the spec:

1. Move `@keyframes shimmer-text` from top-level of `animation.css` into the `@theme { … }` block.
2. Inside `@theme`, immediately after the keyframe, add:

   ```css
   --animate-shimmer-text: shimmer-text 2s linear infinite;
   ```

3. Remove the `animation: shimmer-text 2s linear infinite;` line from the `@utility shimmer-text` block in `utilities.css`.
4. Update Shimmer.tsx (Chunk 2) to apply both classes: `'shimmer-text animate-shimmer-text'` instead of just `'shimmer-text'`.

If the rollback is needed, commit it as a separate commit with message `fix(ui-theme): move shimmer-text keyframe into @theme for Tailwind v4 compat`.

---

## Chunk 2: Shimmer component

The component is intentionally tiny — a single `<span>` that applies the `shimmer-text` utility. The duration prop overrides the default 2s via inline `style`.

### Task 2.1: Create the Shimmer source file

**Files:**
- Create: `packages/ui/react-ui-components/src/components/Shimmer/Shimmer.tsx`

- [ ] **Step 1: Write the component**

Create `packages/ui/react-ui-components/src/components/Shimmer/Shimmer.tsx` with these exact contents:

```tsx
//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ShimmerProps = ThemedClassName<
  PropsWithChildren<{
    /** Animation duration in ms. */
    duration?: number;
  }>
>;

/**
 * Text element whose opacity animates left → right across the content in a loop.
 * Used as an "AI is thinking / streaming" indicator.
 *
 * The mask-based effect modulates true alpha, so the consumer's `color` token is preserved.
 */
export const Shimmer = ({ classNames, children, duration = 2_000 }: ShimmerProps) => {
  return (
    <span
      role='status'
      style={{ animationDuration: `${duration}ms` }}
      className={mx('inline-block shimmer-text', classNames)}
    >
      {children}
    </span>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run: `moon run react-ui-components:build`
Expected: success. (The component isn't exported yet, so this confirms isolated compilation.)

### Task 2.2: Create the Shimmer barrel

**Files:**
- Create: `packages/ui/react-ui-components/src/components/Shimmer/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
//
// Copyright 2025 DXOS.org
//

export * from './Shimmer';
```

- [ ] **Step 2: Add to the components index**

**File:** `packages/ui/react-ui-components/src/components/index.ts`

Insert `export * from './Shimmer';` in alphabetical order — between `./QueryForm` and `./TextCrawl`. The result should look like:

```ts
//
// Copyright 2025 DXOS.org
//

export * from './AnimatedBorder';
export * from './MarkdownStream';
export * from './NumericTabs';
export * from './ProgressBar';
export * from './QueryEditor';
export * from './QueryForm';
export * from './Shimmer';
export * from './TextCrawl';
export * from './Timeline';
export * from './TogglePanel';
```

- [ ] **Step 3: Verify build**

Run: `moon run react-ui-components:build`
Expected: success.

### Task 2.3: Create the Shimmer storybook

**Files:**
- Create: `packages/ui/react-ui-components/src/components/Shimmer/Shimmer.stories.tsx`

- [ ] **Step 1: Write the stories file**

Mirror the existing pattern from [AnimatedBorder.stories.tsx](../../packages/ui/react-ui-components/src/components/AnimatedBorder/AnimatedBorder.stories.tsx). Exact contents:

```tsx
//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { Shimmer } from './Shimmer';

const meta = {
  title: 'ui/react-ui-components/experimental/Shimmer',
  component: Shimmer,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Shimmer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Thinking…',
  },
};

export const LongText: Story = {
  args: {
    classNames: 'block max-w-[24rem] text-center leading-relaxed',
    children:
      'Establishing a secure peer connection, exchanging schemas, and reconciling the object graph before the next frame.',
  },
};

export const WithCustomColor: Story = {
  args: {
    classNames: 'text-sky-600 dark:text-sky-400 text-lg',
    children: 'Color is preserved through the mask',
  },
};

export const SlowCadence: Story = {
  args: {
    duration: 4_000,
    children: '4 second cycle',
  },
};

/**
 * Forces the `prefers-reduced-motion` media query via a story-scoped style tag, so
 * reviewers can inspect the dimmed fallback without changing OS settings.
 */
export const ReducedMotion: Story = {
  decorators: [
    (Story) => (
      <>
        <style>{'@media (prefers-reduced-motion: no-preference) { .shimmer-text { animation-play-state: paused !important; opacity: 0.6 !important; mask-image: none !important; -webkit-mask-image: none !important; } }'}</style>
        <Story />
      </>
    ),
  ],
  args: {
    children: 'Reduced motion fallback',
  },
};
```

> **Note on the `ReducedMotion` story decorator.** The decorator inverts the media query so that the fallback styles apply *unless* the user has reduced-motion enabled. This is a story-only convenience; the production CSS uses the standard `prefers-reduced-motion: reduce` query.

- [ ] **Step 2: Verify build**

Run: `moon run react-ui-components:build`
Expected: success.

- [ ] **Step 3: Visually verify in storybook**

Open the running storybook (from Task 1.4) and navigate to **ui/react-ui-components/experimental/Shimmer**. Confirm:

- `Default` — "Thinking…" text shimmers with a left → right pulse roughly every 2s.
- `LongText` — pulse traverses the full wrapped paragraph, including line breaks (each line shimmers independently because the gradient is per-line in the mask).
- `WithCustomColor` — text is sky-blue; the shimmer modulates only opacity, not color.
- `SlowCadence` — pulse takes 4s per cycle.
- `ReducedMotion` — text is dimly visible at constant ~60% opacity, no animation.

If the pulse appears to teleport or jitter at the loop seam, the rollback path from Task 1.4 may be needed.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-components/src/components/Shimmer packages/ui/react-ui-components/src/components/index.ts
git commit -m "feat(react-ui-components): add experimental Shimmer text component"
```

---

## Chunk 3: Stopwatch component

The Stopwatch has two parts: a pure `formatElapsed` helper (covered by unit tests, since the format-tier logic is the only non-trivial logic in this whole plan) and the React component (visual verification via storybook).

### Task 3.1: TDD — write the formatElapsed test first

**Files:**
- Create: `packages/ui/react-ui-components/src/components/Stopwatch/Stopwatch.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { formatElapsed } from './Stopwatch';

describe('formatElapsed', () => {
  test('zero returns 0s', ({ expect }) => {
    expect(formatElapsed(0)).toBe('0s');
  });

  test('negative inputs clamp to 0s', ({ expect }) => {
    expect(formatElapsed(-1_000)).toBe('0s');
    expect(formatElapsed(-Infinity)).toBe('0s');
  });

  test('seconds tier under one minute', ({ expect }) => {
    expect(formatElapsed(999)).toBe('0s');
    expect(formatElapsed(1_000)).toBe('1s');
    expect(formatElapsed(12_400)).toBe('12s');
    expect(formatElapsed(59_999)).toBe('59s');
  });

  test('boundary at one minute', ({ expect }) => {
    expect(formatElapsed(60_000)).toBe('1m 0s');
    expect(formatElapsed(60_999)).toBe('1m 0s');
    expect(formatElapsed(61_000)).toBe('1m 1s');
  });

  test('minutes tier under one hour', ({ expect }) => {
    expect(formatElapsed(92_000)).toBe('1m 32s');
    expect(formatElapsed(3_540_000)).toBe('59m 0s');
    expect(formatElapsed(3_599_999)).toBe('59m 59s');
  });

  test('boundary at one hour', ({ expect }) => {
    expect(formatElapsed(3_600_000)).toBe('1h 0m');
    expect(formatElapsed(3_660_000)).toBe('1h 1m');
  });

  test('hours tier drops smaller units', ({ expect }) => {
    expect(formatElapsed(3_720_000)).toBe('1h 2m');
    expect(formatElapsed(7_323_000)).toBe('2h 2m');
    expect(formatElapsed(36_000_000)).toBe('10h 0m');
  });
});
```

- [ ] **Step 2: Run the test, expect import failure**

Run: `moon run react-ui-components:test -- src/components/Stopwatch/Stopwatch.test.ts`
Expected: FAIL — module `./Stopwatch` does not exist.

### Task 3.2: Implement formatElapsed (minimum to pass)

**Files:**
- Create: `packages/ui/react-ui-components/src/components/Stopwatch/Stopwatch.tsx` (formatElapsed only for now; component skeleton next task)

- [ ] **Step 1: Implement and export**

Initial contents (component placeholder added so the file is valid; expanded in Task 3.3):

```tsx
//
// Copyright 2025 DXOS.org
//

import React from 'react';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * Formats elapsed milliseconds as a human-readable duration.
 * Tiers: `Ns` (< 60s), `Nm Xs` (< 60m), `Nh Xm` (≥ 60m).
 * Negative inputs clamp to `0s`.
 */
export const formatElapsed = (ms: number): string => {
  const safe = Math.max(0, ms);
  if (safe < MINUTE) {
    return `${Math.floor(safe / SECOND)}s`;
  }
  if (safe < HOUR) {
    const m = Math.floor(safe / MINUTE);
    const s = Math.floor((safe % MINUTE) / SECOND);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(safe / HOUR);
  const m = Math.floor((safe % HOUR) / MINUTE);
  return `${h}h ${m}m`;
};

// Component arrives in the next task; placeholder export keeps the barrel valid early.
export const Stopwatch = () => null;
```

- [ ] **Step 2: Run the tests, expect pass**

Run: `moon run react-ui-components:test -- src/components/Stopwatch/Stopwatch.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-components/src/components/Stopwatch
git commit -m "feat(react-ui-components): add formatElapsed helper with tiered duration formatting"
```

### Task 3.3: Replace the Stopwatch placeholder with the real component

**Files:**
- Modify: `packages/ui/react-ui-components/src/components/Stopwatch/Stopwatch.tsx`

- [ ] **Step 1: Replace the placeholder**

Replace the entire file with:

```tsx
//
// Copyright 2025 DXOS.org
//

import React, { type ReactNode, useEffect, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * Formats elapsed milliseconds as a human-readable duration.
 * Tiers: `Ns` (< 60s), `Nm Xs` (< 60m), `Nh Xm` (≥ 60m).
 * Negative inputs clamp to `0s`.
 */
export const formatElapsed = (ms: number): string => {
  const safe = Math.max(0, ms);
  if (safe < MINUTE) {
    return `${Math.floor(safe / SECOND)}s`;
  }
  if (safe < HOUR) {
    const m = Math.floor(safe / MINUTE);
    const s = Math.floor((safe % MINUTE) / SECOND);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(safe / HOUR);
  const m = Math.floor((safe % HOUR) / MINUTE);
  return `${h}h ${m}m`;
};

export type StopwatchProps = ThemedClassName<{
  /** Start time (epoch ms). Defaults to first-mount time. */
  start?: number;
  /** Animated icon. Defaults to a halo-pulse dot. */
  icon?: ReactNode;
  /** Optional trailing metadata (e.g. token counts). */
  meta?: ReactNode;
}>;

/**
 * Elapsed-time display with an animated icon and optional trailing metadata.
 * Pure display — re-mount or change the `start` prop to reset.
 */
export const Stopwatch = ({ classNames, start: startProp, icon, meta }: StopwatchProps) => {
  const [start] = useState(() => startProp ?? Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      const elapsed = Math.max(0, Date.now() - start);
      // Schedule the next tick aligned to the next whole-second boundary so
      // adjacent Stopwatches advance in lockstep and tab-throttling can't drift.
      timeout = setTimeout(tick, SECOND - (elapsed % SECOND));
    };

    timeout = setTimeout(tick, SECOND - (Math.max(0, Date.now() - start) % SECOND));
    return () => clearTimeout(timeout);
  }, [start]);

  const elapsed = Math.max(0, now - start);

  return (
    <span
      role='status'
      className={mx('inline-flex items-center gap-2 text-description font-mono tabular-nums', classNames)}
    >
      {icon ?? <DefaultIcon />}
      <span>{formatElapsed(elapsed)}</span>
      {meta != null && (
        <>
          <span aria-hidden='true' className='opacity-50'>
            ·
          </span>
          <span>{meta}</span>
        </>
      )}
    </span>
  );
};

const DefaultIcon = () => (
  <span aria-hidden='true' className='inline-block size-2 rounded-full bg-current animate-halo-pulse' />
);
```

> **Why `useState` for `start`.** When the consumer doesn't pass `start`, we capture `Date.now()` once at mount via the lazy initializer. Re-renders never re-capture; only un-mount and re-mount reset.

> **Why a self-rescheduling `setTimeout` instead of `setInterval`.** `setInterval` drifts under tab throttling and visibility-state changes. `setTimeout` aligned to `SECOND - (elapsed % SECOND)` always wakes up at the next whole-second boundary relative to the start time, so multiple Stopwatch instances advance in lockstep regardless of when each was mounted.

- [ ] **Step 2: Re-run the tests**

Run: `moon run react-ui-components:test -- src/components/Stopwatch/Stopwatch.test.ts`
Expected: PASS — formatElapsed unchanged, all 7 tests still green.

- [ ] **Step 3: Build**

Run: `moon run react-ui-components:build`
Expected: success.

### Task 3.4: Create the Stopwatch barrel + register

**Files:**
- Create: `packages/ui/react-ui-components/src/components/Stopwatch/index.ts`
- Modify: `packages/ui/react-ui-components/src/components/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
//
// Copyright 2025 DXOS.org
//

export * from './Stopwatch';
```

- [ ] **Step 2: Add to components index**

Insert `export * from './Stopwatch';` in alphabetical order — between `./Shimmer` and `./TextCrawl`. The result:

```ts
//
// Copyright 2025 DXOS.org
//

export * from './AnimatedBorder';
export * from './MarkdownStream';
export * from './NumericTabs';
export * from './ProgressBar';
export * from './QueryEditor';
export * from './QueryForm';
export * from './Shimmer';
export * from './Stopwatch';
export * from './TextCrawl';
export * from './Timeline';
export * from './TogglePanel';
```

- [ ] **Step 3: Build**

Run: `moon run react-ui-components:build`
Expected: success.

### Task 3.5: Create the Stopwatch storybook

**Files:**
- Create: `packages/ui/react-ui-components/src/components/Stopwatch/Stopwatch.stories.tsx`

- [ ] **Step 1: Write the stories file**

```tsx
//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { Stopwatch } from './Stopwatch';

const meta = {
  title: 'ui/react-ui-components/experimental/Stopwatch',
  component: Stopwatch,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Stopwatch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMeta: Story = {
  args: {
    meta: (
      <>
        <span>↑ 234</span>
        <span aria-hidden='true' className='opacity-50'>
          ·
        </span>
        <span>↓ 1.2k</span>
      </>
    ),
  },
};

export const WithCustomIcon: Story = {
  args: {
    icon: (
      <svg
        aria-hidden='true'
        viewBox='0 0 24 24'
        className='size-3.5 animate-spin-slow'
        fill='none'
        stroke='currentColor'
        strokeWidth={2}
      >
        <circle cx={12} cy={12} r={10} strokeOpacity={0.25} />
        <path d='M22 12a10 10 0 0 0-10-10' strokeLinecap='round' />
      </svg>
    ),
  },
};

export const LongRunning: Story = {
  args: {
    // 65 minutes ago — exercises the `Xh Ym` tier without waiting.
    start: Date.now() - 65 * 60 * 1_000,
  },
};
```

- [ ] **Step 2: Build**

Run: `moon run react-ui-components:build`
Expected: success.

- [ ] **Step 3: Visually verify in storybook**

Navigate to **ui/react-ui-components/experimental/Stopwatch** in the running storybook. Confirm:

- `Default` — pulsing dot + `0s`, ticks up by 1 each second. After 60s, format flips to `1m 0s`.
- `WithMeta` — same time display followed by `· ↑ 234 · ↓ 1.2k`.
- `WithCustomIcon` — slow-rotating SVG circle in place of the dot.
- `LongRunning` — initial render shows `1h 5m`, ticks to `1h 6m` after about 60s.

Open two `Default` instances in different stories side by side (or refresh `Default` repeatedly) and confirm both seconds counters tick at the same instant — verifies the next-second-boundary alignment.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-components/src/components/Stopwatch packages/ui/react-ui-components/src/components/index.ts
git commit -m "feat(react-ui-components): add experimental Stopwatch elapsed-time component"
```

---

## Chunk 4: TextCrawl improvements

Three behavior-preserving cleanups, each landing in a separate commit so any regression bisects cleanly.

### Task 4.1: Honor `prefers-reduced-motion`

**Files:**
- Modify: `packages/ui/react-ui-components/src/components/TextCrawl/TextCrawl.tsx`

- [ ] **Step 1: Read the current TextCrawl**

Read `packages/ui/react-ui-components/src/components/TextCrawl/TextCrawl.tsx` end-to-end. Note:

- `setPosition` at line ~208 sets `transition: transform Xms ease-in-out` directly on `containerRef.current.style`.
- `Line` at line ~247 uses `style={{ transitionDuration: \`${transition / 3}ms\` }}` and `transition-opacity`.

- [ ] **Step 2: Add the reduced-motion subscription**

Add a small `usePrefersReducedMotion` hook. Place it at the bottom of the file, right after the `Line` component:

```tsx
const subscribeReducedMotion = (onChange: () => void): (() => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const getReducedMotionSnapshot = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const useReducedMotion = (): boolean =>
  useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);
```

Add `useSyncExternalStore` to the existing React import at the top of the file.

- [ ] **Step 3: Wire it through `TextRibbon`**

Inside `TextRibbon`, at the top of the function body (just after the existing `const containerRef = …` line), call the hook:

```tsx
const reducedMotion = useReducedMotion();
```

Then update `setPosition` to skip the transition under reduced motion. Replace the existing `setPosition` body:

```tsx
const setPosition = useCallback<TextRibbonController['setPosition']>(
  (index, animate = false) => {
    if (containerRef.current) {
      const shouldAnimate = animate && !reducedMotion;
      containerRef.current.style.transition = shouldAnimate
        ? `transform ${transition}ms ease-in-out`
        : 'transform 0ms';
      containerRef.current.style.transform = `translateY(-${index * lineHeight}px)`;
    }
  },
  [lineHeight, transition, reducedMotion],
);
```

- [ ] **Step 4: Wire it through `Line`**

Pass `reducedMotion` from `TextRibbon` to each `Line`:

```tsx
{lines.map((line, i) => (
  <Line
    key={i}
    line={lines[i]}
    active={index === i || (i === 0 && index === lines.length)}
    transition={transition}
    reducedMotion={reducedMotion}
    classNames={[className, textClassNames]}
  />
))}
{cyclic && (
  <Line
    line={lines[0]}
    active={index === lines.length || index === 0}
    transition={transition}
    reducedMotion={reducedMotion}
    classNames={[className, textClassNames]}
  />
)}
```

Update the `Line` props type and body:

```tsx
const Line = ({
  classNames,
  line,
  active,
  transition,
  reducedMotion,
}: ThemedClassName<{ line: string; active: boolean; transition: number; reducedMotion: boolean }>) => {
  return (
    <div
      role='none'
      style={{ transitionDuration: reducedMotion ? '0ms' : `${transition / 3}ms` }}
      className={mx('flex items-center truncate transition-opacity', active ? 'opacity-100' : 'opacity-50', classNames)}
    >
      {line}
    </div>
  );
};
```

- [ ] **Step 5: Build**

Run: `moon run react-ui-components:build`
Expected: success.

- [ ] **Step 6: Visually verify the four existing TextCrawl stories**

Navigate to **ui/react-ui-components/TextCrawl** and confirm:

- `Default`, `Cyclic`, `Controlled`, `Numbers` — all behave identically to before with reduced-motion **not** set.

Then enable reduced-motion (macOS: **System Settings → Accessibility → Display → Reduce motion**, or via the browser DevTools' "Emulate CSS media feature prefers-reduced-motion") and reload. Confirm:

- All four stories advance through their lines but do so instantly (no scroll animation, no opacity fade).

- [ ] **Step 7: Commit**

```bash
git add packages/ui/react-ui-components/src/components/TextCrawl/TextCrawl.tsx
git commit -m "fix(react-ui-components): honor prefers-reduced-motion in TextCrawl"
```

### Task 4.2: Extract `LINE_FADE_RATIO` constant

**Files:**
- Modify: `packages/ui/react-ui-components/src/components/TextCrawl/TextCrawl.tsx`

- [ ] **Step 1: Add the constant**

Near the top of the file, just below the existing `const emptyLines: string[] = [];` line, add:

```tsx
// The per-line opacity fade runs at 1/3 of the ribbon translate duration, so
// the active line is fully bright by the time the ribbon settles in place.
const LINE_FADE_RATIO = 1 / 3;
```

- [ ] **Step 2: Use it in `Line`**

Replace `transition / 3` with `transition * LINE_FADE_RATIO` in the `Line` component:

```tsx
style={{ transitionDuration: reducedMotion ? '0ms' : `${transition * LINE_FADE_RATIO}ms` }}
```

- [ ] **Step 3: Build & verify**

Run: `moon run react-ui-components:build`
Expected: success.

Visually re-verify the four TextCrawl stories — fade timing should look identical.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-components/src/components/TextCrawl/TextCrawl.tsx
git commit -m "refactor(react-ui-components): extract LINE_FADE_RATIO constant in TextCrawl"
```

### Task 4.3: Remove the rAF TODO from TextCrawl stories

**Files:**
- Modify: `packages/ui/react-ui-components/src/components/TextCrawl/TextCrawl.stories.tsx`

- [ ] **Step 1: Remove the TODO comment**

In the `Numbers` story (around line 84), delete the `// TODO(burdon): Use animation frame.` line. The surrounding `useEffect` already does the right thing for a 1Hz counter; no further change needed.

- [ ] **Step 2: Build**

Run: `moon run react-ui-components:build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-components/src/components/TextCrawl/TextCrawl.stories.tsx
git commit -m "chore(react-ui-components): drop stale rAF TODO in TextCrawl Numbers story"
```

---

## Chunk 5: Final verification

### Task 5.1: Whole-package build, test, and lint

**Files:** none (verification only)

- [ ] **Step 1: Build**

Run: `moon run react-ui-components:build`
Expected: success.

- [ ] **Step 2: Lint**

Run: `moon run react-ui-components:lint -- --fix`
Expected: success, zero remaining errors. If anything got auto-fixed, commit it as `chore: lint fixes`.

- [ ] **Step 3: Run all package tests**

Run: `moon run react-ui-components:test`
Expected: success — including the new `Stopwatch.test.ts` suite (7 tests) plus all pre-existing tests.

- [ ] **Step 4: Build dependent packages**

Run: `moon run ui-theme:build && moon run react-ui-components:build`
Expected: both succeed. Confirms the CSS edits to `ui-theme` propagate cleanly.

### Task 5.2: Cross-component storybook walk-through

**Files:** none (verification only)

- [ ] **Step 1: Confirm Storybook tree layout**

In the running storybook, open the navigation tree. Under **ui/react-ui-components**, confirm:

- An `experimental/` group exists at the top (or alongside, depending on Storybook sorting).
- The group contains exactly two entries: `Shimmer` and `Stopwatch`.
- All non-experimental components (AnimatedBorder, MarkdownStream, …, TextCrawl, …) still appear at the same depth as before this change.

- [ ] **Step 2: Smoke test each new story**

Click through every story in `Shimmer/*` and `Stopwatch/*`. Confirm each renders without console errors (open DevTools console).

- [ ] **Step 3: Confirm TextCrawl regressions are absent**

Click through the four pre-existing TextCrawl stories (`Default`, `Cyclic`, `Controlled`, `Numbers`) once more. Confirm they behave identically to `main` with reduced-motion **not** set.

### Task 5.3: Stop the storybook server

- [ ] **Step 1: Tear down storybook**

Stop the dev server started in Task 1.4.

### Task 5.4: Final status check

- [ ] **Step 1: Confirm clean working tree**

Run: `git status`
Expected: working tree clean. If anything remains uncommitted, decide per CLAUDE.md guidance — commit or surface to the user.

- [ ] **Step 2: Confirm commit count is reasonable**

Run: `git log --oneline main..HEAD`
Expected: roughly **9** commits, in this order:

1. `feat(ui-theme): add shimmer-text keyframe`
2. `feat(ui-theme): honor prefers-reduced-motion for decorative animations`
3. `feat(ui-theme): add shimmer-text utility for opacity-sweep text effect`
4. `feat(react-ui-components): add formatElapsed helper with tiered duration formatting`
5. `feat(react-ui-components): add experimental Shimmer text component`
6. `feat(react-ui-components): add experimental Stopwatch elapsed-time component`
7. `fix(react-ui-components): honor prefers-reduced-motion in TextCrawl`
8. `refactor(react-ui-components): extract LINE_FADE_RATIO constant in TextCrawl`
9. `chore(react-ui-components): drop stale rAF TODO in TextCrawl Numbers story`

Plus the spec/plan commits already on the branch from brainstorming.

---

## Out of scope reminders

These are documented as "do not do" so an executing agent doesn't accidentally bundle them in:

- **`prevLinesRef` mutation refactor in TextCrawl** — deferred per spec; timing-sensitive, risks regression in `greedy` + `cyclic` interactions.
- **aria-live for TextCrawl ribbon** — needs separate accessibility discussion.
- **Splitting controlled/uncontrolled effects in TextCrawl** — separate follow-up.
- **Direct DOM mutation in `TextRibbon.setPosition`** — deliberate perf optimization; do not replace with React state.
- **Controlled `progress` prop on Shimmer** — option-3 from brainstorming; user explicitly chose option-1 (looping only).
- **Imperative `start()` / `stop()` / `reset()` API on Stopwatch** — pure-display by design; consumers re-mount or change `start`.
- **Separate `experimental/` package barrel** — user chose "title prefix only" organization; no source-tree split.
