//
// Copyright 2025 DXOS.org
//

import React, {
  Fragment,
  type NamedExoticComponent,
  type RefAttributes,
  Suspense,
  forwardRef,
  memo,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { log } from '@dxos/log';
import { useDefaultValue } from '@dxos/react-hooks';
import { ScrollArea } from '@dxos/react-ui';
import { byPosition } from '@dxos/util';

import { Capabilities } from '../../../common';
import { type CapabilityManager } from '../../../core';
import { useCapabilities } from '../../hooks';
import { ErrorBoundary } from '../ErrorBoundary';

import { SurfaceContext } from './context';
import { SurfaceInfo } from './SurfaceInfo';
import { type Definition, type Props, type WebComponentDefinition } from './types';

const DEFAULT_PLACEHOLDER = <Fragment />;

const DEBUG = import.meta.env.VITE_DEBUG;

/**
 * Wrapper component for rendering Web Component surfaces.
 * Handles creation, prop setting, and cleanup of Web Components.
 */
const WebComponentWrapper = memo(
  forwardRef<HTMLElement, Props & { definition: WebComponentDefinition }>(
    ({ id, role, data, limit, definition, ...rest }, forwardedRef) => {
      const containerRef = useRef<HTMLDivElement>(null);
      const elementRef = useRef<HTMLElement | null>(null);
      const propsRef = useRef({ id, role, data, limit, ...rest });

      // Update props ref on every render
      propsRef.current = { id, role, data, limit, ...rest };

      // Create element only once
      useEffect(() => {
        if (!containerRef.current || elementRef.current) {
          return;
        }

        // Create the Web Component
        const element = document.createElement(definition.tagName);
        elementRef.current = element;

        // Set initial properties on the Web Component
        Object.assign(element, propsRef.current);

        // Append to container
        containerRef.current.appendChild(element);

        // Setup ref forwarding if provided
        if (typeof forwardedRef === 'function') {
          forwardedRef(element);
        } else if (forwardedRef) {
          forwardedRef.current = element;
        }

        // Cleanup on unmount to prevent memory leaks
        return () => {
          if (elementRef.current && containerRef.current?.contains(elementRef.current)) {
            containerRef.current.removeChild(elementRef.current);
          }
          if (typeof forwardedRef === 'function') {
            forwardedRef(null);
          } else if (forwardedRef) {
            forwardedRef.current = null;
          }
          elementRef.current = null;
        };
      }, [definition.tagName, forwardedRef]);

      // Update props on existing element without recreating it
      // This runs on every render to ensure all props (including those in `rest`) are kept up to date
      useEffect(() => {
        const element = elementRef.current;
        if (!element) {
          return;
        }

        // Update properties on the existing Web Component
        Object.assign(element, propsRef.current);
      });

      return <div ref={containerRef} />;
    },
  ),
);

WebComponentWrapper.displayName = 'WebComponentWrapper';

/**
 * Wrapper component that provides context for a surface.
 */
const SurfaceContextProvider = memo(
  forwardRef<HTMLElement, Props & { definition: Definition }>(
    ({ id, role, data, limit, fallback = DefaultFallback, definition, ...rest }, forwardedRef) => {
      const contextValue = useMemo(() => ({ id, role, data }), [id, role, data]);

      // Handle Web Component surfaces
      if (definition.kind === 'web-component') {
        return (
          <ErrorBoundary data={data} fallback={fallback}>
            <SurfaceContext.Provider value={contextValue}>
              <WebComponentWrapper
                id={id}
                role={role}
                data={data}
                limit={limit}
                definition={definition}
                ref={forwardedRef}
                {...rest}
              />
            </SurfaceContext.Provider>
          </ErrorBoundary>
        );
      }

      // Handle React component surfaces
      const Component = definition.component;

      // TODO(burdon): Remove from production build?
      const debug = DEBUG || '__DX_DEBUG__' in window;
      if (debug) {
        return (
          <ErrorBoundary data={data} fallback={fallback}>
            <div role='none' className='contents' data-id={id} data-role={role}>
              <SurfaceContext.Provider value={contextValue}>
                <SurfaceInfo ref={forwardedRef}>
                  <Component id={id} role={role} data={data} limit={limit} {...rest} />
                </SurfaceInfo>
              </SurfaceContext.Provider>
            </div>
          </ErrorBoundary>
        );
      }

      return (
        <ErrorBoundary data={data} fallback={fallback}>
          <div role='none' className='contents' data-id={id} data-role={role}>
            <SurfaceContext.Provider value={contextValue}>
              <Component id={id} role={role} data={data} limit={limit} {...rest} ref={forwardedRef} />
            </SurfaceContext.Provider>
          </div>
        </ErrorBoundary>
      );
    },
  ),
);

SurfaceContextProvider.displayName = 'SurfaceContextProvider';

/**
 * A surface is a named region of the screen that can be populated by plugins.
 */
// TODO(burdon): Remove ref since relying on this would be error prone.
export const Surface: NamedExoticComponent<Props & RefAttributes<HTMLElement>> = memo(
  forwardRef(({ id: _id, role, data: dataProp, limit, placeholder = DEFAULT_PLACEHOLDER, ...rest }, forwardedRef) => {
    const data = useDefaultValue(dataProp, () => ({}));

    // TODO(wittjosiah): This will make all surfaces depend on a single signal.
    //   This isn't ideal because it means that any change to the data will cause all surfaces to re-render.
    //   This effectively means that plugin modules which contribute surfaces need to all be activated at startup.
    //   This should be fine for now because it's how it worked prior to capabilities api anyway.
    //   In the future, it would be nice to be able to bucket the surface contributions by role.
    const surfaces = useSurfaces();

    // NOTE: Memoizing the candidates makes the surface not re-render based on reactivity within data.
    const definitions = findCandidates(surfaces, { role, data });
    const candidates = limit ? definitions.slice(0, limit) : definitions;
    if (DEBUG && candidates.length === 0) {
      log.warn('no candidates for surface', { role, data });
      return null;
    }

    return (
      <Suspense fallback={placeholder}>
        {candidates.map((definition) => (
          <SurfaceContextProvider
            key={definition.id}
            id={definition.id}
            role={role}
            data={data}
            limit={limit}
            definition={definition}
            ref={forwardedRef}
            {...rest}
          />
        ))}
      </Suspense>
    );
  }),
);

Surface.displayName = 'Surface';

const findCandidates = (surfaces: Definition[], { role, data }: Pick<Props, 'role' | 'data'>) => {
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
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport classNames='p-4 gap-4'>
          <h1 className='flex gap-2 text-sm mbs-2'>{error.message}</h1>
          <pre className='overflow-auto text-xs text-description'>{JSON.stringify(data, null, 2)}</pre>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  }

  return (
    <ScrollArea.Root orientation='vertical'>
      <ScrollArea.Viewport classNames='p-4 gap-4 border border-roseFill'>
        <h1 className='flex gap-2 text-sm mbs-2 text-errorText'>{error.message}</h1>
        <pre className='overflow-x-auto text-xs text-description'>{error.stack}</pre>
        <pre className='overflow-x-auto text-xs text-description'>{JSON.stringify(data, null, 2)}</pre>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
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
export const isSurfaceAvailable = (
  capabilityManager: CapabilityManager.CapabilityManager,
  { role, data }: Pick<Props, 'role' | 'data'>,
) => {
  const surfaces = capabilityManager.getAll(Capabilities.ReactSurface);
  const candidates = findCandidates(surfaces.flat(), { role, data });
  return candidates.length > 0;
};
