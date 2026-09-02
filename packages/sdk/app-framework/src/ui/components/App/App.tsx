//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, Suspense, useEffect, useLayoutEffect, useMemo } from 'react';

import { Capabilities } from '../../../common';
import { topologicalSort } from '../../../helpers';
import {
  FIRST_INTERACTIVE_EVENT,
  LoadingState,
  type StartupProgress,
  type UseAppOptions,
  useCapabilities,
  useLoading,
} from '../../hooks';
import { bootLoader } from './loader';

export type AppProps = Pick<UseAppOptions, 'debounce'> & {
  ready: boolean;
  error: unknown;
  progress?: StartupProgress;
};

export const App = ({ ready, error, debounce, progress }: AppProps) => {
  const reactContexts = useCapabilities(Capabilities.ReactContext);
  const reactRoots = useCapabilities(Capabilities.ReactRoot);
  const sortedContexts = useMemo(() => topologicalSort(reactContexts), [reactContexts]);
  const stage = useLoading(ready, debounce);
  const placeholderDismissed = stage >= LoadingState.Done;
  // The shell mounts a tick EARLIER than the dismissal, at the same stage that starts the loader's
  // outro: the loader is still on screen (z-index 10) and fading, so the real UI paints beneath it
  // instead of after it — gating both on `Done` leaves a blank frame between the two.
  const shellMounted = stage >= LoadingState.FadeOut;

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
    bootLoader?.progress(0.5 + fraction * 0.5);
    if (progress?.humanizedName) {
      bootLoader?.status({
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
      bootLoader?.ready();
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
    if (performance.getEntriesByName(FIRST_INTERACTIVE_EVENT).length === 0) {
      performance.mark(FIRST_INTERACTIVE_EVENT);
      // Dispatched as well as marked: hosts capture their startup summary on `Startup` activated,
      // which is at least two debounce ticks before this mark exists, so a summary field reading
      // the mark is always absent. The event carries the number instead of racing for it.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(FIRST_INTERACTIVE_EVENT, { detail: Math.round(performance.now()) }));
      }
    }
    bootLoader?.dismiss();
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

  // The boot loader owns the screen until its outro starts; render nothing
  // until then (any DOM here would sit invisibly behind the `z-index: 10`
  // loader anyway).
  // TODO(wittjosiah): Consider using Suspense instead.
  if (!shellMounted) {
    return null;
  }

  return (
    // Contexts nest, so one suspending provider necessarily withholds everything below it; the
    // boundary here at least keeps that from unwinding past the app's providers.
    <Suspense fallback={null}>
      <ContextChain contexts={sortedContexts}>
        {reactRoots.map(({ id, root: Component }) => (
          // One boundary per root: roots read capabilities whose providers activate in a later
          // wave, and `useCapability` suspends on that. A shared boundary would let one late root
          // withhold every other root's already-renderable content — the blank shell this fixes.
          <Suspense key={id} fallback={null}>
            <Component />
          </Suspense>
        ))}
      </ContextChain>
    </Suspense>
  );
};

/**
 * Nests each provider around the next at render time so the element type is a constant: composing
 * the nesting into a component makes it a new type per render, remounting the whole app on any
 * capability change. A contributed context appends, so the chain extends inward and the providers
 * above keep their positions; a removed one still shifts everything below it.
 */
const ContextChain = ({ contexts, children }: PropsWithChildren<{ contexts: Capabilities.ReactContext[] }>) => {
  if (contexts.length === 0) {
    return <>{children}</>;
  }

  const [{ context: Context }, ...rest] = contexts;
  return (
    <Context>
      <ContextChain contexts={rest}>{children}</ContextChain>
    </Context>
  );
};
