//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, { type FC, type PropsWithChildren, useMemo } from 'react';

import { ContextProtocolProvider } from '@dxos/web-context-react';

import { Capabilities } from '../../../common';
import { PluginManagerContext } from '../../../context';
import { type PluginManager } from '../../../core';
import { topologicalSort } from '../../../helpers';
import { useCapabilities } from '../../hooks/useCapabilities';
import { PluginManagerProvider } from '../PluginManager/PluginManagerProvider';
import { type SurfaceManager } from './SurfaceManager';
import { SurfaceManagerProvider } from './SurfaceManagerContext';

const Passthrough = ({ children }: PropsWithChildren) => <>{children}</>;

/**
 * Composes contributed `Capabilities.ReactContext` wrappers (topologically sorted by
 * `dependsOn`) into a single provider component. Shared by the app shell, the test
 * harness, and detached surface roots so all three compose identically.
 */
export const composeContexts = (contexts: Capabilities.ReactContext[]): FC<PropsWithChildren> => {
  if (contexts.length === 0) {
    return Passthrough;
  }

  return topologicalSort(contexts)
    .map(({ context }) => context)
    .reduce((Acc, Next) => ({ children }: PropsWithChildren) => (
      <Acc>
        <Next>{children}</Next>
      </Acc>
    ));
};

export type SurfaceRootProvidersProps = PropsWithChildren<{
  manager: PluginManager.PluginManager;
  surfaces: SurfaceManager;
}>;

/**
 * The provider stack a detached React root needs to behave as part of the app: the kernel
 * providers (plugin manager, atom registry, surface manager) plus every contributed
 * `Capabilities.ReactContext`. The registry is hard-wired to `manager.registry` because the
 * atom hooks silently fall back to a disconnected default registry when unprovided —
 * state would go stale without ever throwing.
 */
export const SurfaceRootProviders = ({ manager, surfaces, children }: SurfaceRootProvidersProps) => (
  <PluginManagerProvider value={manager}>
    <ContextProtocolProvider value={manager} context={PluginManagerContext}>
      <RegistryContext.Provider value={manager.registry}>
        <SurfaceManagerProvider value={surfaces}>
          <ContributedContexts>{children}</ContributedContexts>
        </SurfaceManagerProvider>
      </RegistryContext.Provider>
    </ContextProtocolProvider>
  </PluginManagerProvider>
);

const ContributedContexts = ({ children }: PropsWithChildren) => {
  const reactContexts = useCapabilities(Capabilities.ReactContext);
  const Composed = useMemo(() => composeContexts(reactContexts), [reactContexts]);
  return <Composed>{children}</Composed>;
};
