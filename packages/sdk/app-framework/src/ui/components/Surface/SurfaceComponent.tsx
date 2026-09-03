//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import React, {
  type FC,
  Fragment,
  type NamedExoticComponent,
  Profiler,
  Suspense,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { ErrorBoundary } from '@dxos/react-error-boundary';
import { useDefaultValue } from '@dxos/react-hooks';
import { Position } from '@dxos/util';

import { ActivationEvents, Capabilities, Role } from '../../../common/index.ts';
import { type PluginManager } from '../../../core/index.ts';
import { useOptionalPluginManager, usePluginManager } from '../PluginManager/index.ts';
import { SurfaceContext } from './context.ts';
import { DebugSurface, isSurfaceDebugEnabled, isSurfaceWrapperEnabled } from './SurfaceDebug.tsx';
import { type SurfaceManager } from './SurfaceManager.ts';
import { useSurfaceManager } from './SurfaceManagerContext.ts';
import { nextDataChurn, surfaceMetrics } from './SurfaceMetrics.ts';
import { useSurfaceProfilerCallback } from './SurfaceProfilerContext.tsx';
import { type Definition, type Props, type TypedProps, type WebComponentDefinition } from './types.ts';

const DEBUG = import.meta.env?.VITE_DEBUG;

const DEFAULT_PLACEHOLDER = <Fragment />;

/**
 * Fires the role's surface demand event so modules gated on it load (see the `roles` option of
 * the surface module maker). Safe to call repeatedly: the surface manager claims the first
 * demand per role, which keeps mount cost flat where Surface instances are numerous (every card
 * in a grid mounts one) instead of re-entering the scheduler.
 */
const requestSurfaces = (
  surfaceManager: SurfaceManager,
  manager: PluginManager.PluginManager | undefined,
  role: string,
): void => {
  if (!manager || !surfaceManager.requestRole(role)) {
    return;
  }
  EffectEx.runDetached(
    manager
      .activate(ActivationEvents.SurfacesRequested(role))
      .pipe(
        Effect.onExit((exit) =>
          Exit.isFailure(exit) ? Effect.sync(() => surfaceManager.releaseRole(role)) : Effect.void,
        ),
      ),
  );
};

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
    // `props` lets a definition register a plain container and map the surface props onto its own,
    // instead of wrapping it in an adapter component (see `TypedReactDefinition.props`).
    const surfaceProps = { id, role, data, limit, ...rest };
    const component = <Component {...(definition.props?.(surfaceProps) ?? surfaceProps)} />;
    const profiled =
      onProfilerRender && !profilerId.includes('org.dxos.plugin.debug') ? (
        <Profiler id={profilerId} onRender={onProfilerRender}>
          {component}
        </Profiler>
      ) : (
        component
      );

    // Dev builds wrap every surface in `<dx-surface>` for DOM inspection / `window.__DX__`; the
    // `__DX_DEBUG__` flag separately gates the visual highlight overlay (see SurfaceDebug).
    if (isSurfaceWrapperEnabled()) {
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
    // True while a module gated on this role is still activating, so a surface specific to `data`
    // may still be coming (see `holdFallbacks`).
    const rolePending = useAtomValue(surfaceManager.pendingAtom(effectiveRole));

    // Rendering a surface for a role is the demand signal for role-gated modules: their
    // contributions land in the candidates atom and re-render this surface.
    const pluginManager = useOptionalPluginManager();
    useEffect(() => {
      requestSurfaces(surfaceManager, pluginManager, effectiveRole);
    }, [surfaceManager, pluginManager, effectiveRole]);

    // NOTE: The data guard runs per render so the surface re-dispatches on reactive data changes.
    const matched = matchCandidates(roleCandidates, effectiveRole, data);
    const definitions = holdFallbacks(matched, rolePending);
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

    // An explicit `limit={0}` means render nothing — including while a role is still activating,
    // where the placeholder below would otherwise reintroduce output the caller opted out of.
    if (limit === 0) {
      return null;
    }

    if (candidates.length === 0) {
      // A held fallback is not a miss: the role's own module is still loading, and rendering
      // nothing here (rather than `null`) keeps the plank's placeholder up until it lands.
      if (rolePending) {
        return placeholder;
      }
      if (DEBUG) {
        log.warn('no candidates for surface', { role: effectiveRole, data });
      }
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
 * Withholds catch-all matches while the role's own modules are still activating.
 *
 * A module gated on a role's demand event is absent from the first render that requests it, so an
 * eager `Position.last` catch-all (plugin-space's record article matches any ECHO object) claims the
 * slot and is replaced a second later when the specific module's chunk lands — a flash of unrelated
 * UI, not a slower load. Holding ONLY fallbacks is the conservative half of the fix: a surface that
 * already has a specific match renders immediately, so this can never delay a plank that has real
 * content to show.
 */
const holdFallbacks = (definitions: Definition[], pending: boolean): Definition[] =>
  pending ? definitions.filter((definition) => definition.position !== Position.last) : definitions;

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
 * Reports whether a contributed surface matches the given role & data, without mounting it.
 *
 * Typed: pass a `type` role token and `data` is constrained to the token's
 * declared contract (e.g. `AppSurface.Section` requires `attendableId`).
 */
type IsSurfaceAvailable = <TToken extends Role.Role<any>>(args: { type: TToken; data?: Role.Data<TToken> }) => boolean;

/**
 * @returns a stable function that checks whether a contributed surface is available for a
 * role & data. The surface manager is captured via context, so the returned function carries
 * no dependency of its own and is safe to store and invoke later — e.g. from inside another
 * callback such as a render-prop or event handler — since it calls no hooks itself.
 */
export const useIsSurfaceAvailable = (): IsSurfaceAvailable => {
  const surfaceManager = useSurfaceManager();
  const pluginManager = useOptionalPluginManager();
  const registry = useContext(RegistryContext);
  return useCallback<IsSurfaceAvailable>(
    (args: { type: Role.Role<any>; data?: Props['data'] }) => {
      const effectiveRole = args.type?.role;
      if (effectiveRole == null) {
        return false;
      }

      const candidates = matchCandidates(
        registry.get(surfaceManager.candidatesAtom(effectiveRole)),
        effectiveRole,
        args.data,
      );

      if (candidates.length === 0) {
        // A miss may mean the role's modules are gated and not yet loaded: fire the demand
        // event so a later check (or a mounted Surface) sees the loaded contributions.
        requestSurfaces(surfaceManager, pluginManager, effectiveRole);
      }

      return candidates.length > 0;
    },
    [surfaceManager, pluginManager, registry],
  );
};
