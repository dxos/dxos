//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, {
  type FC,
  Fragment,
  type NamedExoticComponent,
  Profiler,
  Suspense,
  memo,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { log } from '@dxos/log';
import { ErrorBoundary } from '@dxos/react-error-boundary';
import { useDefaultValue } from '@dxos/react-hooks';

import { Capabilities } from '../../../common';
import * as Role from '../../../common/Role';
import { type CapabilityManager } from '../../../core';
import { usePluginManager } from '../PluginManager';
import { SurfaceContext } from './context';
import { DebugSurface, isSurfaceDebugEnabled } from './SurfaceDebug';
import { indexByRole } from './SurfaceManager';
import { useSurfaceManager } from './SurfaceManagerContext';
import { nextDataChurn, surfaceMetrics } from './SurfaceMetrics';
import { useSurfaceProfilerCallback } from './SurfaceProfilerContext';
import { type Definition, type Props, type TypedProps, type WebComponentDefinition } from './types';

const DEBUG = import.meta.env?.VITE_DEBUG;

const DEFAULT_PLACEHOLDER = <Fragment />;

/**
 * Wrapper component for rendering Web Component surfaces.
 * Handles creation, prop setting, and cleanup of Web Components.
 */
type WebComponentWrapperProps = {
  id?: string;
  role: string;
  data?: Record<string, any>;
  limit?: number;
  definition: WebComponentDefinition;
  [key: string]: any;
};

const WebComponentWrapper = memo(({ id, role, data, limit, definition, ...rest }: WebComponentWrapperProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const propsRef = useRef({ id, role, data, limit, ...rest });

  // Update props ref on every render.
  propsRef.current = { id, role, data, limit, ...rest };

  // Create element only once.
  useEffect(() => {
    if (!containerRef.current || elementRef.current) {
      return;
    }

    // Create the Web Component.
    const element = document.createElement(definition.tagName);
    elementRef.current = element;

    // Set initial properties on the Web Component.
    Object.assign(element, propsRef.current);

    // Append to container.
    containerRef.current.appendChild(element);

    // Cleanup on unmount to prevent memory leaks.
    return () => {
      if (elementRef.current && containerRef.current?.contains(elementRef.current)) {
        containerRef.current.removeChild(elementRef.current);
      }
      elementRef.current = null;
    };
  }, [definition.tagName]);

  const previousPropsRef = useRef<Record<string, any>>({});

  // Keep all props (including those in `rest`) in sync on the existing element,
  // removing any that disappeared since the last render so no stale config lingers.
  useEffect(() => {
    const element = elementRef.current;
    if (element) {
      for (const key of Object.keys(previousPropsRef.current)) {
        if (!(key in propsRef.current)) {
          Reflect.deleteProperty(element, key);
        }
      }
      Object.assign(element, propsRef.current);
      previousPropsRef.current = propsRef.current;
    }
  });

  return <div ref={containerRef} />;
});

WebComponentWrapper.displayName = 'WebComponentWrapper';

type SurfaceContextProviderProps = {
  id: string;
  role: string;
  data?: Record<string, any>;
  limit?: number;
  fallback?: FC<{ error: Error; data?: any }>;
  definition: Definition;
  [key: string]: any;
};

/**
 * Wrapper component that provides context for a surface.
 */
// TODO(burdon): Allow DebugPlugin to provide different fallback using react-ui ErrorFallback.
const SurfaceContextProvider = memo(
  ({ id, role, data, limit, fallback = ErrorFallback, definition, ...rest }: SurfaceContextProviderProps) => {
    const contextValue = useMemo(() => ({ id, role, data }), [id, role, data]);
    const onProfilerRender = useSurfaceProfilerCallback();
    const profilerId = `surface/${id}/${role}`;
    // Count error-boundary trips against this surface (dev only).
    const onError = isSurfaceDebugEnabled() ? () => surfaceMetrics.recordError(id, role) : undefined;

    // Handle Web Component surfaces.
    if (definition.kind === 'web-component') {
      return (
        <ErrorBoundary name='surface' resetKeys={[data]} FallbackComponent={fallback} onError={onError}>
          <SurfaceContext.Provider value={contextValue}>
            <WebComponentWrapper id={id} role={role} data={data} limit={limit} definition={definition} {...rest} />
          </SurfaceContext.Provider>
        </ErrorBoundary>
      );
    }

    // Handle React component surfaces.
    const Component = definition.component;
    const component = <Component id={id} role={role} data={data} limit={limit} {...rest} />;
    const profiled =
      onProfilerRender && !profilerId.includes('org.dxos.plugin.debug') ? (
        <Profiler id={profilerId} onRender={onProfilerRender}>
          {component}
        </Profiler>
      ) : (
        component
      );

    if (isSurfaceDebugEnabled()) {
      return (
        <ErrorBoundary name='surface' resetKeys={[data]} FallbackComponent={fallback} onError={onError}>
          <SurfaceContext.Provider value={contextValue}>
            <DebugSurface info={contextValue}>{profiled}</DebugSurface>
          </SurfaceContext.Provider>
        </ErrorBoundary>
      );
    }

    // Production renders the matched component directly: a surface adds no wrapper element of its own.
    return (
      <ErrorBoundary name='surface' resetKeys={[data]} FallbackComponent={fallback} onError={onError}>
        <SurfaceContext.Provider value={contextValue}>{profiled}</SurfaceContext.Provider>
      </ErrorBoundary>
    );
  },
);

SurfaceContextProvider.displayName = 'SurfaceContextProvider';

/**
 * A surface is a named region of the screen that can be populated by plugins.
 * The `type` prop is a {@link Role.Role} that defines which region and its
 * associated data contract.
 *
 * A surface is a boundary that may resolve to zero, one, or many components, so
 * it intentionally accepts no `ref`; consumers needing an element should own one
 * inside their contributed component.
 */
export const SurfaceComponent = memo(
  ({
    id: _id,
    type,
    data: dataProp,
    limit,
    placeholder = DEFAULT_PLACEHOLDER,
    ...rest
  }: TypedProps<Role.Role<any>>) => {
    const data = useDefaultValue(dataProp, () => ({}));
    const surfaceManager = useSurfaceManager();
    // Subscribe only to this role's contributions: contributing/removing a surface for a
    // different role keeps this bucket referentially stable, so the atom does not re-render us.
    const effectiveRole = type?.role ?? '';
    const roleCandidates = useAtomValue(surfaceManager.candidatesAtom(effectiveRole));

    // NOTE: The data guard runs per render so the surface re-dispatches on reactive data changes.
    const definitions = matchCandidates(roleCandidates, effectiveRole, data);
    // `limit != null` (not truthiness) so an explicit `limit={0}` renders nothing.
    const candidates = limit != null ? definitions.slice(0, limit) : definitions;
    const truncated = limit != null && definitions.length > limit;

    // Dev metrics: track dispatch count, candidate count, and `data` instability (see SurfaceMetrics).
    const churnRef = useRef<{ data: unknown; churn: number }>({ data: undefined, churn: 0 });
    useEffect(() => {
      if (!isSurfaceDebugEnabled() || effectiveRole === '') {
        return;
      }
      const previous = churnRef.current;
      const churn = previous.data === undefined ? 0 : nextDataChurn(previous.data, data, previous.churn);
      churnRef.current = { data, churn };
      for (const definition of candidates) {
        surfaceMetrics.recordDispatch(definition.id, effectiveRole, {
          candidates: candidates.length,
          truncated,
          dataChurn: churn,
        });
      }
    });

    if (type?.role == null) {
      if (DEBUG) {
        log.warn('Surface is missing required `type` prop', { id: _id });
      }
      return null;
    }

    if (DEBUG && candidates.length === 0) {
      log.warn('no candidates for surface', { role: effectiveRole, data });
      return null;
    }

    return (
      <Suspense fallback={placeholder}>
        {candidates.map((definition) => (
          <SurfaceContextProvider
            key={definition.id}
            id={definition.id}
            role={effectiveRole}
            data={data}
            limit={limit}
            definition={definition}
            {...rest}
          />
        ))}
      </Suspense>
    );
  },
  // The generic call signature is reattached here because `memo` erases it from the inferred type.
) as (<TToken extends Role.Role<any>>(props: TypedProps<TToken>) => React.ReactNode) &
  NamedExoticComponent<TypedProps<Role.Role<any>>>;

SurfaceComponent.displayName = 'Surface';

// TODO(burdon): Make user facing, with telemetry.
const ErrorFallback = ({ error }: { error: Error }) => {
  const { message } = error instanceof Error ? error : { message: String(error) };
  return (
    <div role='alert' data-testid='error-boundary-fallback'>
      <h1 className='flex p-2 text-sm text-info-text'>{message}</h1>
    </div>
  );
};

/**
 * Filters the pre-indexed candidates for a role through their data guards.
 */
const matchCandidates = (
  definitions: ReadonlyArray<Definition> | undefined,
  role: string,
  data: Props['data'],
): Definition[] => {
  if (!definitions) {
    return [];
  }
  return definitions.filter(({ filter }) => (filter ? filter(data ?? {}, role) : true));
};

/**
 * @internal
 */
export const useSurfaces = () => {
  const manager = usePluginManager();
  const surfacesByModule = useAtomValue(manager.capabilities.atomByModule(Capabilities.ReactSurface));
  return useMemo(() => {
    const result: Definition[] = [];
    for (const [_moduleId, surfaces] of Object.entries(surfacesByModule)) {
      for (const def of surfaces.flat()) {
        result.push(def);
      }
    }
    return result;
  }, [surfacesByModule]);
};

/**
 * @returns `true` if there is a contributed surface which matches the specified role & data, `false` otherwise.
 *
 * Typed: pass a `type` role token and `data` is constrained to the token's
 * declared contract (e.g. `AppSurface.Section` requires `attendableId`).
 */
export function isSurfaceAvailable<TToken extends Role.Role<any>>(
  capabilityManager: CapabilityManager.CapabilityManager,
  args: { type: TToken; data?: Role.Data<TToken> },
): boolean {
  const effectiveRole = args.type?.role;
  if (effectiveRole == null) {
    return false;
  }

  const surfaces = capabilityManager.getAll(Capabilities.ReactSurface);
  const index = indexByRole(surfaces.flat());
  const candidates = matchCandidates(index.get(effectiveRole), effectiveRole, args.data as Props['data']);
  return candidates.length > 0;
}
