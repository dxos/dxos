//
// Copyright 2025 DXOS.org
//

import React, { type ReactNode, useLayoutEffect } from 'react';

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
      tick: () => void;
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
 * native-DOM boot loader (injected by `bootLoaderPlugin`) once the React
 * tree is *visible* — `useLayoutEffect` fires before the next paint so the
 * loader DOM is removed in the same frame the placeholder commits, avoiding
 * a blank-with-status-bar flash on handoff.
 *
 * Stage progression (driven by `useApp`):
 *   - `0` — Loading: logo hidden (opacity 0), pre-fade scale.
 *   - `1` — FadeIn: logo at full opacity, identity scale.
 *   - `2` — FadeOut: logo shrinks and fades as the real shell mounts.
 */
export const Placeholder = ({ stage = 1, logo }: PlaceholderComponentProps) => {
  // Used in tests to exercise the error boundary & reset dialog.
  if (location.search === '?throw') {
    throw new Error('Test error');
  }

  // Hand off from the native-DOM boot loader once the React placeholder is
  // *visible*. The logo here is `opacity-0` at `stage = 0` (Loading) and only
  // becomes visible at `FadeIn` and beyond — dismissing on mount would expose
  // a blank-with-status-bar frame for one debounce tick. `useLayoutEffect`
  // ensures the dismiss is committed before the next paint.
  useLayoutEffect(() => {
    if (stage >= 1) {
      window.__bootLoader?.dismiss();
    }
  }, [stage]);

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
