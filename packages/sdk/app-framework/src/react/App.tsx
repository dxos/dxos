//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import * as Common from '../common';
import { topologicalSort } from '../helpers';

import { type UseAppOptions } from './useApp';
import { useCapabilities } from './useCapabilities';
import { LoadingState, useLoading } from './useLoading';

export type AppProps = Pick<UseAppOptions, 'placeholder' | 'debounce'> & {
  ready: boolean;
  error: unknown;
};

export const App = ({ placeholder: Placeholder, ready, error, debounce }: AppProps) => {
  const reactContexts = useCapabilities(Common.Capability.ReactContext);
  const reactRoots = useCapabilities(Common.Capability.ReactRoot);
  const stage = useLoading(ready, debounce);

  if (error) {
    // This triggers the error boundary to provide UI feedback for the startup error.
    throw error;
  }

  // TODO(wittjosiah): Consider using Suspense instead.
  if (stage < LoadingState.Done) {
    if (!Placeholder) {
      return null;
    }

    return <Placeholder stage={stage} />;
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

const composeContexts = (contexts: Common.Capability.ReactContext[]) => {
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
