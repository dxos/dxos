//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { type RenderOptions, type RenderResult, render as rtlRender } from '@testing-library/react';
import React, { type FC, Fragment, type PropsWithChildren, type ReactNode } from 'react';

import { ContextProtocolProvider } from '@dxos/web-context-react';

import { Capabilities } from '../common';
import { PluginManagerContext } from '../context';
import { topologicalSort } from '../helpers';
import { PluginManagerProvider } from '../ui/components/PluginManager/PluginManagerProvider';
import { SurfaceComponent } from '../ui/components/Surface/SurfaceComponent';
import { type RoleToken } from '../ui/components/Surface/types';
import { type TestHarness } from './harness';

export type HarnessRenderOptions = Omit<RenderOptions, 'wrapper'> & {
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
  return rtlRender(<>{ui}</>, { ...rest, wrapper: Wrapper });
};

export type RenderSurfaceProps<TToken extends RoleToken<any>> = {
  type: TToken;
  data?: TToken extends RoleToken<infer D> ? D : never;
  limit?: number;
  fallback?: FC<{ error: Error; data?: any }>;
  placeholder?: ReactNode;
};

/**
 * Renders a `Surface` with the given role token/data inside the harness provider tree.
 */
export const renderSurface = <TToken extends RoleToken<any>>(
  harness: TestHarness,
  props: RenderSurfaceProps<TToken>,
  options?: HarnessRenderOptions,
): RenderResult => {
  const { type, data, limit, fallback, placeholder } = props;
  return render(
    harness,
    <SurfaceComponent type={type} data={data as any} limit={limit} fallback={fallback} placeholder={placeholder} />,
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

// Composes in innermost-first order: the first context in the array wraps
// `children` directly; subsequent contexts wrap the accumulator.
const composeExtra = (contexts: FC<PropsWithChildren>[]): FC<PropsWithChildren> => {
  if (contexts.length === 0) {
    return Passthrough;
  }
  return contexts.reduce<FC<PropsWithChildren>>(
    (Acc, Next) =>
      ({ children }: PropsWithChildren) => (
        <Next>
          <Acc>{children}</Acc>
        </Next>
      ),
    Passthrough,
  );
};

const Passthrough: FC<PropsWithChildren> = ({ children }) => <Fragment>{children}</Fragment>;
