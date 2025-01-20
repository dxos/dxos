//
// Copyright 2025 DXOS.org
//

import React, { memo, forwardRef, Suspense, useMemo } from 'react';

import { useDefaultValue } from '@dxos/react-hooks';
import { byDisposition } from '@dxos/util';

import { ErrorBoundary } from './ErrorBoundary';
import { useCapabilities } from './useCapabilities';
import { Capabilities, type SurfaceDefinition, type SurfaceProps } from '../common';
import { type PluginsContext } from '../core';

const useSurfaces = () => {
  const surfaces = useCapabilities(Capabilities.ReactSurface);
  return useMemo(() => surfaces.flat(), [surfaces]);
};

const findCandidates = (surfaces: SurfaceDefinition[], { role, data }: Pick<SurfaceProps, 'role' | 'data'>) => {
  return Object.values(surfaces)
    .filter((definition) =>
      Array.isArray(definition.role) ? definition.role.includes(role) : definition.role === role,
    )
    .filter(({ filter }) => (filter ? filter(data ?? {}) : true))
    .toSorted(byDisposition);
};

export const isSurfaceAvailable = (context: PluginsContext, { role, data }: Pick<SurfaceProps, 'role' | 'data'>) => {
  const surfaces = context.requestCapabilities(Capabilities.ReactSurface);
  const candidates = findCandidates(surfaces.flat(), { role, data });
  return candidates.length > 0;
};

/**
 * A surface is a named region of the screen that can be populated by plugins.
 */
export const Surface = memo(
  forwardRef<HTMLElement, SurfaceProps>(
    ({ id: _id, role, data: _data, limit, fallback, placeholder, ...rest }, forwardedRef) => {
      // TODO(wittjosiah): This will make all surfaces depend on a single signal.
      //   This isn't ideal because it means that any change to the data will cause all surfaces to re-render.
      //   This effectively means that plugin modules which contribute surfaces need to all be activated at startup.
      //   This should be fine for now because it's how it worked prior to capabilities api anyways.
      //   In the future, it would be nice to be able to bucket the surface contributions by role.
      const surfaces = useSurfaces();
      const data = useDefaultValue(_data, () => ({}));

      const candidates = useMemo(() => {
        const definitions = findCandidates(surfaces, { role, data });
        return limit ? definitions.slice(0, limit) : definitions;
      }, [surfaces, role, data, limit]);

      const nodes = candidates.map(({ component: Component, id }) => (
        <Component ref={forwardedRef} key={id} id={id} role={role} data={data} limit={limit} {...rest} />
      ));

      const suspense = placeholder ? <Suspense fallback={placeholder}>{nodes}</Suspense> : nodes;

      return fallback ? (
        <ErrorBoundary data={data} fallback={fallback}>
          {suspense}
        </ErrorBoundary>
      ) : (
        suspense
      );
    },
  ),
);
