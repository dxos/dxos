//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { render as rtlRender, type RenderOptions, type RenderResult } from '@testing-library/react';
import React, { type FC, Fragment, type PropsWithChildren, type ReactNode } from 'react';

import { ContextProtocolProvider } from '@dxos/web-context-react';

import { Capabilities } from '../common';
import { PluginManagerContext } from '../context';
import { topologicalSort } from '../helpers';
import { PluginManagerProvider } from '../ui/components/PluginManager/PluginManagerProvider';
import { SurfaceComponent } from '../ui/components/Surface/SurfaceComponent';
import { type TestHarness } from './harness';

export type HarnessRenderOptions = RenderOptions & {
  /** Additional providers to wrap around the harness tree (applied innermost first). */
  reactContexts?: FC<PropsWithChildren>[];
};

/**
 * Renders `ui` wrapped in the same provider tree as `useApp` plus every contributed
 * `Capabilities.ReactContext`.
 */
export const render = (harness: TestHarness, ui: ReactNode, options?: HarnessRenderOptions): RenderResult => {
  const { reactContexts = [], ...rest } = options ?? {};
  const Wrapper = ({ children }: PropsWithChildren) => (
    <HarnessProviders harness={harness} extra={reactContexts}>
      {children}
    </HarnessProviders>
  );
  return rtlRender(<>{ui}</>, { wrapper: Wrapper, ...rest });
};

export type RenderSurfaceProps = {
  role: string;
  data?: unknown;
  limit?: number;
  fallback?: FC<{ error: Error; data?: any }>;
  placeholder?: ReactNode;
};

/**
 * Renders a `Surface` with the given role/data inside the harness provider tree.
 */
export const renderSurface = (
  harness: TestHarness,
  props: RenderSurfaceProps,
  options?: HarnessRenderOptions,
): RenderResult => {
  const { role, data, limit, fallback, placeholder } = props;
  return render(
    harness,
    <SurfaceComponent role={role} data={data as any} limit={limit} fallback={fallback} placeholder={placeholder} />,
    options,
  );
};

type HarnessProvidersProps = PropsWithChildren<{
  harness: TestHarness;
  extra: FC<PropsWithChildren>[];
}>;

const HarnessProviders = ({ harness, extra, children }: HarnessProvidersProps) => {
  const contributed = harness.getAll(Capabilities.ReactContext);
  const ContributedContext = composeContexts(contributed);
  const ExtraContext = composeExtra(extra);
  return (
    <PluginManagerProvider value={harness.manager}>
      <ContextProtocolProvider value={harness.manager} context={PluginManagerContext}>
        <RegistryContext.Provider value={harness.registry}>
          <ContributedContext>
            <ExtraContext>{children}</ExtraContext>
          </ContributedContext>
        </RegistryContext.Provider>
      </ContextProtocolProvider>
    </PluginManagerProvider>
  );
};

const composeContexts = (contexts: Capabilities.ReactContext[]): FC<PropsWithChildren> => {
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

const composeExtra = (contexts: FC<PropsWithChildren>[]): FC<PropsWithChildren> => {
  if (contexts.length === 0) {
    return Passthrough;
  }
  return contexts.reduce((Acc, Next) => ({ children }: PropsWithChildren) => (
    <Acc>
      <Next>{children}</Next>
    </Acc>
  ));
};

const Passthrough: FC<PropsWithChildren> = ({ children }) => <Fragment>{children}</Fragment>;
