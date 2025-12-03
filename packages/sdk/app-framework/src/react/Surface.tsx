//
// Copyright 2025 DXOS.org
//

import React, {
  type ComponentType,
  type Context,
  Fragment,
  type NamedExoticComponent,
  type RefAttributes,
  Suspense,
  createContext,
  forwardRef,
  memo,
  useContext,
  useMemo,
} from 'react';

import { raise } from '@dxos/debug';
import { useDefaultValue } from '@dxos/react-hooks';
import { byPosition } from '@dxos/util';

import { Capabilities, type SurfaceDefinition, type SurfaceProps } from '../common';
import { type PluginContext } from '../core';

import { ErrorBoundary } from './ErrorBoundary';
import { SurfaceInfo } from './SurfaceInfo';
import { useCapabilities } from './useCapabilities';

const DEFAULT_PLACEHOLDER = <Fragment />;

export type SurfaceContext = Pick<SurfaceProps, 'id' | 'role' | 'data'>;

// TODO(burdon): Use @radix-ui/react-context
const SurfaceContext: Context<SurfaceContext | undefined> = createContext<SurfaceContext | undefined>(undefined);

/**
 * Wrapper component that provides context for a surface.
 */
const SurfaceContextProvider = memo(
  forwardRef<HTMLElement, SurfaceProps & { component: ComponentType<any> }>(
    ({ id, role, data, limit, component: Component, ...rest }, forwardedRef) => {
      const contextValue = useMemo(() => ({ id, role, data }), [id, role, data]);

      return (
        <SurfaceContext.Provider value={contextValue}>
          <SurfaceInfo ref={forwardedRef}>
            <Component id={id} role={role} data={data} limit={limit} {...rest} />
          </SurfaceInfo>
        </SurfaceContext.Provider>
      );
    },
  ),
);

SurfaceContextProvider.displayName = 'SurfaceContextProvider';

export const useSurface = (): SurfaceContext => {
  const context = useContext(SurfaceContext) ?? raise(new Error('Missing SurfaceContext'));
  return context;
};

/**
 * A surface is a named region of the screen that can be populated by plugins.
 */
export const Surface: NamedExoticComponent<SurfaceProps & RefAttributes<HTMLElement>> = memo(
  forwardRef(
    (
      { id: _id, role, data: dataParam, limit, fallback = DefaultFallback, placeholder = DEFAULT_PLACEHOLDER, ...rest },
      forwardedRef,
    ) => {
      const data = useDefaultValue(dataParam, () => ({}));

      // TODO(wittjosiah): This will make all surfaces depend on a single signal.
      //   This isn't ideal because it means that any change to the data will cause all surfaces to re-render.
      //   This effectively means that plugin modules which contribute surfaces need to all be activated at startup.
      //   This should be fine for now because it's how it worked prior to capabilities api anyway.
      //   In the future, it would be nice to be able to bucket the surface contributions by role.
      const surfaces = useSurfaces();

      // NOTE: Memoizing the candidates makes the surface not re-render based on reactivity within data.
      const definitions = findCandidates(surfaces, { role, data });
      const candidates = limit ? definitions.slice(0, limit) : definitions;
      const nodes = candidates.map(({ id, component }) => (
        <SurfaceContextProvider
          key={id}
          id={id}
          role={role}
          data={data}
          limit={limit}
          component={component}
          ref={forwardedRef}
          {...rest}
        />
      ));

      // TODO(burdon): Wrap each component with an error boundary.
      return (
        <ErrorBoundary data={data} fallback={fallback}>
          <Suspense fallback={placeholder}>{nodes}</Suspense>
        </ErrorBoundary>
      );
    },
  ),
);

Surface.displayName = 'Surface';

const findCandidates = (surfaces: SurfaceDefinition[], { role, data }: Pick<SurfaceProps, 'role' | 'data'>) => {
  return Object.values(surfaces)
    .filter((definition) =>
      Array.isArray(definition.role) ? definition.role.includes(role) : definition.role === role,
    )
    .filter(({ filter }) => (filter ? filter(data ?? {}) : true))
    .toSorted(byPosition);
};

// TODO(burdon): Make user facing, with telemetry.
// TODO(burdon): Change based on dev/prod mode; infer subject type, id.
const DefaultFallback = ({ data, error, dev }: { data: any; error: Error; dev?: boolean }) => {
  if (dev) {
    return (
      <div className='flex flex-col gap-4 p-4 is-full overflow-y-auto'>
        <h1 className='flex gap-2 text-sm mbs-2'>{error.message}</h1>
        <pre className='overflow-auto text-xs text-description'>{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4 p-4 is-full overflow-y-auto border border-roseFill'>
      <h1 className='flex gap-2 text-sm mbs-2 text-rose-500'>{error.message}</h1>
      <pre className='overflow-auto text-xs text-description'>{error.stack}</pre>
      <pre className='overflow-auto text-xs text-description'>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

/**
 * @internal
 */
export const useSurfaces = () => {
  const surfaces = useCapabilities(Capabilities.ReactSurface);
  return useMemo(() => surfaces.flat(), [surfaces]);
};

/**
 * @returns `true` if there is a contributed surface which matches the specified role & data, `false` otherwise.
 */
export const isSurfaceAvailable = (context: PluginContext, { role, data }: Pick<SurfaceProps, 'role' | 'data'>) => {
  const surfaces = context.getCapabilities(Capabilities.ReactSurface);
  const candidates = findCandidates(surfaces.flat(), { role, data });
  return candidates.length > 0;
};
