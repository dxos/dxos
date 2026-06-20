//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useLayoutEffect } from 'react';

import { Capabilities } from '../../../common';
import { topologicalSort } from '../../../helpers';
import { LoadingState, type StartupProgress, type UseAppOptions, useCapabilities, useLoading } from '../../hooks';

declare global {
  interface Window {
    /**
     * Driver injected by `@dxos/app-framework/vite-plugin`'s `bootLoaderPlugin`
     * (a Solid app inlined into `index.html`). Declared here — on a module that
     * is part of the `@dxos/app-framework/ui` export surface — so the React side
     * and host apps (e.g. composer-app) can drive the loader without each
     * re-declaring the type. The canonical definition lives in the plugin's
     * `loader-app/types.ts`; this mirror exists because that source compiles in a
     * separate (Solid) program that doesn't ship its globals to consumers.
     */
    __bootLoader?: {
      status: (payload: {
        event?: string;
        module?: string;
        humanized: string;
        /**
         * Optional `(index/total)` tick. When present, the loader replaces the
         * current line in place ("Loading plugins (12/80)") instead of appending
         * a new entry — keeps the visible log compact during long counted phases.
         */
        range?: { index: number; total: number };
      }) => void;
      progress: (fraction?: number) => void;
      ready: () => void;
      dismiss: () => void;
    };
  }
}

export type AppProps = Pick<UseAppOptions, 'debounce'> & {
  ready: boolean;
  error: unknown;
  progress?: StartupProgress;
};

const FIRST_INTERACTIVE_MARK = 'app-framework:first-interactive';

export const App = ({ ready, error, debounce, progress }: AppProps) => {
  const reactContexts = useCapabilities(Capabilities.ReactContext);
  const reactRoots = useCapabilities(Capabilities.ReactRoot);
  const stage = useLoading(ready, debounce);
  const placeholderDismissed = stage >= LoadingState.Done;

  // Relay the startup lifecycle into the boot loader injected by
  // `@dxos/app-framework/vite-plugin` (a Solid app inlined into `index.html`,
  // the only visible loading UI). Plugin activation fills the `[0.5, 1]` half
  // of the ring; the raw `event` / `module` ids ride along so the loader owns
  // how each transition is rendered and traced. No-op once the outro has
  // started (`FadeOut`), so the dismissal runs uncontended.
  useEffect(() => {
    if (stage >= LoadingState.FadeOut) {
      return;
    }
    const fraction = progress?.progress ?? 0;
    window.__bootLoader?.progress(0.5 + fraction * 0.5);
    if (progress?.humanizedName) {
      window.__bootLoader?.status({
        event: progress.event,
        module: progress.module,
        humanized: `Activating ${progress.humanizedName}`,
      });
    }
  }, [stage, progress?.progress, progress?.event, progress?.module, progress?.humanizedName]);

  // Hand off at fade-out: play the loader's graceful shrink-and-fade outro.
  // `useLayoutEffect` runs before the next paint so the outro begins in the
  // same frame the real shell starts rendering beneath it.
  useLayoutEffect(() => {
    if (stage >= LoadingState.FadeOut) {
      window.__bootLoader?.ready();
    }
  }, [stage]);

  // Emit a once-per-app `app-framework:first-interactive` mark the first time
  // the loader is dismissed and the real app shell renders. Closes the gap
  // between `Startup` activated and the first interactive paint.
  //
  // Also the framework-owned handoff-complete signal: `dismiss()` removes the
  // loader immediately on the fast-load path (where `useLoading` skips
  // `FadeOut`), and is a no-op once an outro is already in flight, so it never
  // cuts the animation short.
  useEffect(() => {
    if (!placeholderDismissed) {
      return;
    }
    if (performance.getEntriesByName(FIRST_INTERACTIVE_MARK).length === 0) {
      performance.mark(FIRST_INTERACTIVE_MARK);
    }
    window.__bootLoader?.dismiss();
  }, [placeholderDismissed]);

  // Used in tests to exercise the error boundary & reset dialog (see
  // composer-app's `basic.spec.ts`). Thrown into the surrounding `ErrorBoundary`.
  if (location.search === '?throw') {
    throw new Error('Test error');
  }

  if (error) {
    // This triggers the error boundary to provide UI feedback for the startup error.
    throw error;
  }

  // The boot loader owns the screen until handoff completes; render nothing
  // until then (any DOM here would sit invisibly behind the `z-index: 10`
  // loader anyway).
  // TODO(wittjosiah): Consider using Suspense instead.
  if (!placeholderDismissed) {
    return null;
  }

  const ComposedContext = composeContexts(reactContexts);
  return (
    <ComposedContext>
      {reactRoots.map(({ id, root: Component }) => (
        <Component key={id} />
      ))}
    </ComposedContext>
  );
};

const composeContexts = (contexts: Capabilities.ReactContext[]) => {
  if (contexts.length === 0) {
    return ({ children }: PropsWithChildren) => <>{children}</>;
  }

  return topologicalSort(contexts)
    .map(({ context }) => context)
    .reduce((Acc, Next) => ({ children }) => (
      <Acc>
        <Next>{children}</Next>
      </Acc>
    ));
};
