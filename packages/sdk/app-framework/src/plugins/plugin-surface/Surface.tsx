//
// Copyright 2022 DXOS.org
//

import React, { Suspense, forwardRef, memo, useEffect, useId, useMemo } from 'react';

import { useDefaultValue } from '@dxos/react-hooks';

import { ErrorBoundary } from './ErrorBoundary';
import { type SurfaceProps, useSurfaceRoot } from './SurfaceContext';

/**
 * A surface is a named region of the screen that can be populated by plugins.
 */
export const Surface = memo(
  forwardRef<HTMLElement, SurfaceProps>(
    ({ id: _id, role, data: _data, limit, fallback, placeholder, ...rest }, forwardedRef) => {
      const { surfaces, debugInfo } = useSurfaceRoot();
      const data = useDefaultValue(_data, () => ({}));

      // Track debug info.
      const reactId = useId();
      const id = _id ?? reactId;
      useEffect(() => {
        debugInfo?.set(id, { id, created: Date.now(), role, renderCount: 0 });
        return () => {
          debugInfo?.delete(id);
        };
      }, [id]);

      if (debugInfo?.get(id)) {
        debugInfo.get(id)!.renderCount++;
      }

      const candidates = useMemo(() => {
        const definitions = Object.values(surfaces)
          .filter((definition) =>
            Array.isArray(definition.role) ? definition.role.includes(role) : definition.role === role,
          )
          .filter(({ filter }) => (filter ? filter(data) : true))
          .toSorted(({ disposition: a = 'default' }, { disposition: b = 'default' }) => {
            return a === b ? 0 : a === 'hoist' || b === 'fallback' ? -1 : b === 'hoist' || a === 'fallback' ? 1 : 0;
          });
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
