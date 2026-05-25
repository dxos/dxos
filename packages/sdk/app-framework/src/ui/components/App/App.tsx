//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useEffect } from 'react';

import { Capabilities } from '../../../common';
import { topologicalSort } from '../../../helpers';
import { LoadingState, type StartupProgress, type UseAppOptions, useCapabilities, useLoading } from '../../hooks';

export type AppProps = Pick<UseAppOptions, 'placeholder' | 'debounce'> & {
  ready: boolean;
  error: unknown;
  progress?: StartupProgress;
};

const FIRST_INTERACTIVE_MARK = 'app-framework:first-interactive';

export const App = ({ placeholder: Placeholder, ready, error, debounce, progress }: AppProps) => {
  const reactContexts = useCapabilities(Capabilities.ReactContext);
  const reactRoots = useCapabilities(Capabilities.ReactRoot);
  const stage = useLoading(ready, debounce);
  const placeholderDismissed = stage >= LoadingState.Done;

  // Emit a once-per-app `app-framework:first-interactive` mark the first time
  // the placeholder is dismissed and the real app shell renders. Closes the
  // gap between `Startup` activated and the first interactive paint.
  //
  // Also dismisses the native-DOM boot loader from
  // `@dxos/app-framework/vite-plugin` here — the framework owns the
  // handoff-complete signal, so dismissing in `App` covers both hosts that
  // wire in a `Placeholder` (which may have its own dismiss path) and hosts
  // that don't (the loader would otherwise sit forever as a `z-index: 10`
  // overlay covering the rendered shell).
  useEffect(() => {
    if (!placeholderDismissed) {
      return;
    }
    if (performance.getEntriesByName(FIRST_INTERACTIVE_MARK).length === 0) {
      performance.mark(FIRST_INTERACTIVE_MARK);
    }
    (window as { __bootLoader?: { dismiss?: () => void } }).__bootLoader?.dismiss?.();
  }, [placeholderDismissed]);

  if (error) {
    // This triggers the error boundary to provide UI feedback for the startup error.
    throw error;
  }

  // TODO(wittjosiah): Consider using Suspense instead.
  if (!placeholderDismissed) {
    if (!Placeholder) {
      return null;
    }

    return <Placeholder stage={stage} progress={progress} />;
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
