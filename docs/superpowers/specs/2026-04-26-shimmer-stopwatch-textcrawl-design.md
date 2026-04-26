# Shimmer, Stopwatch, and TextCrawl Improvements

## Summary

Add two experimental components to `@dxos/react-ui-components`, inspired by the timer / "thinking" affordances at the bottom of the Claude desktop code editor:

- **Shimmer** — a text element whose opacity animates left→right in a loop, used as an "AI is thinking / streaming" indicator.
- **Stopwatch** — an elapsed-time display with an animated icon and optional trailing metadata (e.g. token counts).

Plus a small set of low-risk improvements to the existing `TextCrawl` component, found while reviewing the repo for prior art.

## Scope

### In scope

- New `Shimmer` component in `packages/ui/react-ui-components/src/components/Shimmer/`.
- New `Stopwatch` component in `packages/ui/react-ui-components/src/components/Stopwatch/`.
- New CSS keyframe + token in [animation.css](../../../packages/ui/ui-theme/src/css/theme/animation.css) for the shimmer mask animation.
- Stories for both components, titled under `ui/react-ui-components/experimental/<Name>` (storybook organization only — files live alongside non-experimental components).
- Low-risk improvements to [TextCrawl.tsx](../../../packages/ui/react-ui-components/src/components/TextCrawl/TextCrawl.tsx).
- Public exports through `src/components/index.ts` and `src/index.ts` (no separate experimental barrel).

### Out of scope (deferred)

- Controlled progress (`progress` prop) on Shimmer — covered as a future option but not implemented now.
- Stopwatch start/stop/reset controller API — current scope is pure-display; consumers re-mount or change `start` to reset.
- TextCrawl behavior-changing rewrites: removing direct DOM mutation in `setPosition`, splitting the controlled/uncontrolled effects, adding aria-live semantics.
- Shimmer on non-text children — typed `PropsWithChildren` so it can wrap any subtree, but only verified on inline text.

## Design

### 1. Shimmer

**Package:** `@dxos/react-ui-components`
**File:** `src/components/Shimmer/Shimmer.tsx`

All new `.tsx` / `.ts` files start with the standard DXOS copyright header, matching neighboring files:

```ts
//
// Copyright 2025 DXOS.org
//
```

```tsx
import React, { type PropsWithChildren } from 'react';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ShimmerProps = ThemedClassName<PropsWithChildren<{
  /** Animation duration in ms. */
  duration?: number;
}>>;

export const Shimmer = ({ classNames, children, duration = 2000 }: ShimmerProps) => {
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

**Why a `mask-image` gradient (not `background-clip: text`)** — the user's spec is "animates opacity from left to right across the text". A mask gradient modulates true alpha, so the consumer's `color` / theme tokens are preserved. Vercel `ai-elements` shimmer uses `background-clip: text` with two stacked gradients ([reference](https://github.com/vercel/ai-elements/blob/main/packages/elements/src/shimmer.tsx)), which forces a hard-coded color into the gradient and loses the consumer's `text-fg-*` token during the highlight pulse. Mask is the cleaner primitive and the better fit for a generic component.

**CSS additions** in [packages/ui/ui-theme/src/css/theme/animation.css](../../../packages/ui/ui-theme/src/css/theme/animation.css). The existing `@theme { ... }` block (lines 5–229) already groups all keyframes and `--animate-*` tokens; the new keyframe and token are added inside that block, **before** the closing brace, alongside the existing `Shimmer` section:

```css
@theme {
  /* ... existing content ... */

  /**
   * Shimmer (text)
   * Sweeps a brighter band across text via mask alpha — preserves the consumer's color.
   */
  @keyframes shimmer-text {
    from {
      mask-position: 200% 0;
      -webkit-mask-position: 200% 0;
    }
    to {
      mask-position: -200% 0;
      -webkit-mask-position: -200% 0;
    }
  }
  --animate-shimmer-text: shimmer-text 2s linear infinite;
}
```

Tailwind v4's `@theme` block exposes `--animate-shimmer-text` as the `animate-shimmer-text` utility, which only sets the `animation` shorthand. The supporting `mask-*` declarations and `prefers-reduced-motion` fallback live in a sibling `@utility` block in the same file (Tailwind v4 idiom for utilities that need multiple declarations):

```css
@utility shimmer-text {
  mask-image: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.35) 0%,
    rgba(0, 0, 0, 0.35) 35%,
    rgba(0, 0, 0, 1) 50%,
    rgba(0, 0, 0, 0.35) 65%,
    rgba(0, 0, 0, 0.35) 100%
  );
  -webkit-mask-image: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.35) 0%,
    rgba(0, 0, 0, 0.35) 35%,
    rgba(0, 0, 0, 1) 50%,
    rgba(0, 0, 0, 0.35) 65%,
    rgba(0, 0, 0, 0.35) 100%
  );
  mask-size: 300% 100%;
  -webkit-mask-size: 300% 100%;
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;
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

`mask-size: 300% 100%` plus a gradient that hits `0.35` at both ends gives a continuous shimmer with no visible "off" frame at the loop seam: the gradient is 3× the element width, and the keyframe slides the mask exactly 4× its width (from `200%` to `-200%`), so a fresh highlight is always entering as the previous one exits. The component class is `shimmer-text` (no `animate-` prefix) because `@utility` blocks register their selector verbatim. The existing `--animate-shimmer` (skeleton-overlay translateX, unused) is left untouched.

### 2. Stopwatch

**Package:** `@dxos/react-ui-components`
**File:** `src/components/Stopwatch/Stopwatch.tsx`

```tsx
export type StopwatchProps = ThemedClassName<{
  /** Start time (epoch ms). Defaults to first-mount time. */
  start?: number;
  /** Animated icon. Defaults to a halo-pulse dot. */
  icon?: ReactNode;
  /** Optional trailing metadata (e.g. token counts). */
  meta?: ReactNode;
}>;

export const Stopwatch: FC<StopwatchProps>;
```

**Behavior:**

- Format tiers (drop smaller units past each tier, matches CLI feel):
  - `t < 60s` → `12s`
  - `60s ≤ t < 60m` → `1m 32s`
  - `t ≥ 60m` → `1h 2m`
- Tick at 1Hz, scheduled to align with the next second boundary (`setTimeout(updater, 1000 - (Math.max(0, Date.now() - start)) % 1000)`) so visible drift stays under a frame and adjacent Stopwatches don't visibly desync.
- Elapsed value is clamped to `Math.max(0, Date.now() - start)` everywhere it's used (display + tick scheduling). A `start` in the future therefore renders `0s` until real time catches up — no negative display, no negative timer delay (which would queue a microtask flood).
- Layout: `<icon> <time> · <meta>` — middle-dot separator only when `meta` is present and rendered as an inline span between `time` and `meta`.
- Time uses `font-mono tabular-nums` so width is stable within a tier.
- Pure display; no imperative `start()` / `stop()` API. Re-mount or change the `start` prop to reset.

**Default icon** — a small dot using the existing `--animate-halo-pulse` token:

```tsx
const DefaultIcon = () => (
  <span className='inline-block size-2 rounded-full bg-current animate-halo-pulse' />
);
```

Consumers can pass any `ReactNode` (e.g. a Phosphor `Spinner` with `animate-spin-slow`).

**`prefers-reduced-motion`** — `--animate-halo-pulse` is currently defined without a reduced-motion fallback. As part of this change, append the following sibling block to [animation.css](../../../packages/ui/ui-theme/src/css/theme/animation.css), placed immediately after the closing brace of the existing `@theme { ... }` block (it cannot live inside `@theme` because `@media` is not valid there):

```css
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

This is intentionally broader than just `halo-pulse`: any `animate-*` token in this file is decorative, so silencing them all under reduced-motion matches the spirit of the user preference. `animate-fade-*`, `animate-slide-*`, `animate-toast-*`, and `animate-blink` are deliberately excluded — they are functional transitions (mounting / dismissal / cursor) where suppressing the animation would hide UI state changes.

Custom icons (passed via the `icon` prop) are the consumer's responsibility.

### 3. TextCrawl improvements

Behavior-preserving cleanups only; landing in [TextCrawl.tsx](../../../packages/ui/react-ui-components/src/components/TextCrawl/TextCrawl.tsx) and [TextCrawl.stories.tsx](../../../packages/ui/react-ui-components/src/components/TextCrawl/TextCrawl.stories.tsx):

1. **Honor `prefers-reduced-motion`** — when the media query matches, force `transition: 0ms` for both ribbon translate and per-line opacity. Read once via `useSyncExternalStore` on `matchMedia('(prefers-reduced-motion: reduce)')` so it stays correct if the user toggles the OS setting.
2. **Name the magic line-fade ratio** — extract `transition / 3` (per-line opacity transition) to a top-level constant `LINE_FADE_RATIO = 1 / 3` for self-documentation.
3. **Resolve the rAF TODO in stories** — the `// TODO(burdon): Use animation frame.` at [TextCrawl.stories.tsx:84](../../../packages/ui/react-ui-components/src/components/TextCrawl/TextCrawl.stories.tsx:84) describes a 1Hz counter where an interval is fine. Remove the TODO; add a one-line comment if needed.

Out of scope (intentional):

- **`prevLinesRef` mutation inside `useMemo`** — was originally on the cleanup list, but the relocation (to a `useEffect` comparator) changes the timing relative to the three downstream effects that read `wasReset`. The current pattern is ugly (mutating a ref inside `useMemo` is on React's anti-pattern list) but it's working today and the four existing TextCrawl stories cover the touchy `greedy + cyclic` interactions. Leaving for a focused follow-up alongside the controlled/uncontrolled effect split.
- The direct DOM mutation in `TextRibbon.setPosition` is a deliberate perf optimization (no React reconciliation per-frame) and matches sibling components in the package; keep as-is.
- aria-live for the ribbon needs a separate accessibility discussion (when does a crawl announce vs. silently scroll?).
- Splitting the controlled/uncontrolled effects would untangle the file but risks subtle regressions in `greedy` + `cyclic` interactions; leave for a focused follow-up.

### File layout

```
packages/ui/react-ui-components/
  src/components/
    Shimmer/
      Shimmer.tsx
      Shimmer.stories.tsx          # title: 'ui/react-ui-components/experimental/Shimmer'
      index.ts
    Stopwatch/
      Stopwatch.tsx
      Stopwatch.stories.tsx        # title: 'ui/react-ui-components/experimental/Stopwatch'
      index.ts
    TextCrawl/                     # edit only
      TextCrawl.tsx
      TextCrawl.stories.tsx
    index.ts                       # add ./Shimmer + ./Stopwatch

packages/ui/ui-theme/src/css/theme/animation.css   # add shimmer-text keyframe + token
```

`@dxos/react-ui-components`'s `src/index.ts` re-exports `./components`, so the new components automatically land on the public surface. There is no separate `experimental/` barrel — "experimental" is a Storybook organization decision only.

### Stories

**Shimmer** (`Shimmer.stories.tsx`):

- `Default` — placeholder text ("Thinking…").
- `LongText` — multi-line wrapped paragraph (verifies the mask works across line breaks).
- `WithCustomColor` — inherits a non-default `text-fg-*` token (verifies color preservation, the key advantage over the `bg-clip-text` approach).
- `ReducedMotion` — decorator forcing `prefers-reduced-motion` via a `<style>` injection so the fallback can be inspected.

**Stopwatch** (`Stopwatch.stories.tsx`):

- `Default` — running, default halo-pulse icon, no meta.
- `WithMeta` — token-count style trailing meta: `↑ 234 · ↓ 1.2k`.
- `WithCustomIcon` — Phosphor `Spinner` with `animate-spin-slow`.
- `LongRunning` — `start` set 65 minutes in the past, exercises the `Xh Ym` tier without waiting.

## Testing

Visual verification via Storybook is the primary acceptance gate (these are presentational components with trivial logic):

1. `moon run react-ui-components:storybook` — verify all four Shimmer stories and four Stopwatch stories render and animate correctly.
2. Toggle the OS reduced-motion setting (or use the `ReducedMotion` story decorator) and confirm both components fall back to a non-animated state.
3. Confirm Storybook tree has a top-level `experimental/` group containing only `Shimmer` and `Stopwatch`.
4. Confirm existing TextCrawl stories still pass and behave identically (same scroll / timing / cyclic behavior).

No new unit tests — the components are CSS-driven and the time-formatting helper for Stopwatch is the only piece worth a vitest. A small `Stopwatch.test.ts` covers the three format tiers and the `0s`/`60s`/`3600s` boundaries.

## Risks

- **Mask-image browser support** — Safari < 16 needs `-webkit-mask-*` prefixes. The `@utility` block writes both. All other targets supported per [caniuse mask](https://caniuse.com/css-masks).
- **Tailwind v4 `@utility` validation** — `@utility` blocks must be at the top level of the file (not nested in `@theme`). The implementation places it as a sibling of `@theme`. If the existing build doesn't recognize `@utility` (e.g. older Tailwind v4 milestone), fall back to a plain `.shimmer-text` class declaration in the same file — Tailwind v4 preserves unknown classes pass-through.
- **Storybook title placement** — the spec asserts the experimental group sits under `ui/react-ui-components/experimental/...`. Implementation must verify by running storybook locally before merging; sibling stories use exactly this prefix (`title: 'ui/react-ui-components/<Component>'`), so adding the `experimental/` segment is consistent.
- **Stopwatch tick alignment** — `setInterval` drifts under tab-throttling; using a self-rescheduling `setTimeout` aligned to `Date.now()` plus the `Math.max(0, …)` clamp makes us robust against throttling, visibility-state pauses, and future-`start` values.
- **TextCrawl reduced-motion regression** — the existing four stories must continue to render and progress identically when reduced-motion is NOT set. Implementation verifies all four stories (Default, Cyclic, Controlled, Numbers) under both states before merging.

## Migration / rollout

No migration. New components are additive. TextCrawl changes are behavior-preserving.
