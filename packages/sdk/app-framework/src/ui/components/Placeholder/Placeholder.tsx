//
// Copyright 2025 DXOS.org
//

import React, { type ReactNode, useEffect, useLayoutEffect } from 'react';

import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx, mx } from '@dxos/ui-theme';

import { type PlaceholderProps as PlaceholderSlotProps } from '../../hooks';

declare global {
  interface Window {
    /**
     * Driver injected by `@dxos/app-framework/vite-plugin`'s `bootLoaderPlugin`.
     * Declared here so the {@link Placeholder} can dismiss the native-DOM
     * loader once the React placeholder commits without each host having to
     * re-declare the type.
     */
    __bootLoader?: {
      status: (text: string) => void;
      progress: (fraction?: number) => void;
      dismiss: () => void;
    };
  }
}

export type PlaceholderComponentProps = PlaceholderSlotProps & {
  /**
   * Brand mark rendered while the React tree settles. Pass either a static
   * `ReactNode` (the framework wraps it in a sizing/animation div) or a
   * render function that receives the precomputed `className` so the host
   * can apply it directly to its logo (e.g. an SVG that accepts `className`
   * — `composer-app` passes `(p) => <Composer {...p} />` from `@dxos/brand`).
   */
  logo?: ReactNode | ((props: { className: string }) => ReactNode);
};

/**
 * React placeholder rendered while plugins activate. Hands off from the
 * native-DOM boot loader (injected by `bootLoaderPlugin`) only once the
 * placeholder is *fading out* — until then we keep the loader alive and
 * feed it the module-activation progress so the ring is a single
 * continuous indicator across both phases (chunks + activation):
 *
 *   - composer-app fills `0 → 50%` from `getPlugins`'s per-chunk counter.
 *   - the placeholder takes over at 50% and fills `50 → 100%` from
 *     `useApp`'s `startupProgress.progress` (`activated / total` modules).
 *   - the boot loader is dismissed once `stage >= 2` (FadeOut) and the
 *     placeholder mark cross-fades from underneath.
 *
 * Stage progression (driven by `useApp`):
 *   - `0` — Loading: logo hidden (opacity 0), pre-fade scale.
 *   - `1` — FadeIn: logo at full opacity, identity scale.
 *   - `2` — FadeOut: logo shrinks and fades as the real shell mounts.
 */
export const Placeholder = ({ stage = 1, progress, logo }: PlaceholderComponentProps) => {
  // Used in tests to exercise the error boundary & reset dialog.
  if (location.search === '?throw') {
    throw new Error('Test error');
  }

  // Phase B: feed activation progress + status to the still-visible boot
  // loader. Maps `[0, 1]` activation → `[0.5, 1]` of the ring; surfaces
  // `progress.status` (humanised module id from `useApp`) so the loader's
  // status line tracks each module being activated rather than holding the
  // pre-activation "Starting Composer…" text. No-op once the loader has
  // been dismissed (its `progress()` / `status()` early-return when the
  // boot DOM is gone). Skipping `stage >= 2` lets the dismissal run
  // uncontended.
  useEffect(() => {
    if (stage >= 2) {
      return;
    }
    const fraction = progress?.progress ?? 0;
    window.__bootLoader?.progress(0.5 + fraction * 0.5);
    if (progress?.status) {
      window.__bootLoader?.status(`Activating ${progress.status}…`);
    }
  }, [stage, progress?.progress, progress?.status]);

  // Hand off from the native-DOM boot loader once the placeholder starts
  // fading out — keeping the loader visible through `stage 0` and `stage 1`
  // means the ring stays the visible source of truth for activation
  // progress. `useLayoutEffect` runs before the next paint so the loader
  // DOM is removed in the same frame the cross-fade begins.
  useLayoutEffect(() => {
    if (stage >= 2) {
      window.__bootLoader?.dismiss();
    }
  }, [stage]);

  // Backstop: `useLoading` can skip straight from stage 0 to `Done` when
  // `ready` is true on the first debounce tick. The stage-driven effect
  // above never sees `stage >= 2` in that case (the placeholder unmounts
  // while still at stage 0), so the loader would otherwise stay alive.
  // Dismissing on unmount covers the fast-load path.
  useEffect(() => {
    return () => {
      window.__bootLoader?.dismiss();
    };
  }, []);

  const logoClassName = mx(
    'h-[300px] w-[300px] scale-600 transition-all duration-500 ease-in-out filter grayscale opacity-0',
    stage >= 1 && 'scale-100 grayscale-0 opacity-70',
    stage >= 2 && 'scale-50 opacity-0',
  );

  return (
    <ThemeProvider tx={defaultTx}>
      <div role='none' className='relative dx-container h-dvh flex flex-col'>
        <div role='none' className='flex flex-col grow justify-center items-center'>
          {typeof logo === 'function' ? (
            logo({ className: logoClassName })
          ) : logo ? (
            <div className={logoClassName}>{logo}</div>
          ) : null}
        </div>
      </div>
    </ThemeProvider>
  );
};
