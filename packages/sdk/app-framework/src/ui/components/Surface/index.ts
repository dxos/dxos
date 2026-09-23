//
// Copyright 2025 DXOS.org
//

import { Role } from '../../../common/index.ts';
import { SurfaceContext } from './context.ts';
import { SurfaceComponent, useIsSurfaceAvailable } from './SurfaceComponent.tsx';
import {
  type MountedSurface,
  getMountedSurfaces,
  getSelectedSurfaceRole,
  isSurfaceDebugEnabled,
  setSelectedSurfaceRole,
  setSurfaceDebug,
  useMountedSurfaces,
  useSelectedSurfaceRole,
} from './SurfaceDebug.tsx';
import { type SurfaceMetric, surfaceMetrics, useSurfaceMetrics } from './SurfaceMetrics.ts';
import {
  SurfaceProfilerProvider,
  aggregateSurfaceProfilerStats,
  useSurfaceProfilerCallback,
  useSurfaceProfilerClear,
  useSurfaceProfilerEntries,
  useSurfaceProfilerSnapshot,
  useSurfaceProfilerStats,
} from './SurfaceProfilerContext.tsx';
import {
  type Binding as SurfaceBindingType,
  type ComponentProps as SurfaceComponentPropsType,
  type Definition as SurfaceDefinition,
  type Filter as SurfaceFilterType,
  type TypedProps as SurfaceTypedProps,
  create as createSurface,
  createWeb as createWebSurface,
  isFilter as isFilterFn,
  makeFilter as makeFilterFn,
} from './types.ts';

export namespace Surface {
  export type Definition = SurfaceDefinition;
  export const create = createSurface;
  export const createWeb = createWebSurface;

  export type Context = SurfaceContext;
  export const Context = SurfaceContext;

  export const Surface = SurfaceComponent;
  export const useIsAvailable = useIsSurfaceAvailable;

  export type Binding = SurfaceBindingType;
  export type Filter<TData> = SurfaceFilterType<TData>;
  export const makeFilter = makeFilterFn;
  export const isFilter = isFilterFn;

  export type TypedProps<TToken extends Role.Role<any>> = SurfaceTypedProps<TToken>;

  /** Props a matched surface component receives, and the input to a definition's `props` mapper. */
  export type ComponentProps<T extends Record<string, any> = Record<string, any>> = SurfaceComponentPropsType<T>;

  export const isDebugEnabled = isSurfaceDebugEnabled;
  export const setDebug = setSurfaceDebug;

  export const ProfilerProvider = SurfaceProfilerProvider;
  export const useProfilerCallback = useSurfaceProfilerCallback;
  export const useProfilerEntries = useSurfaceProfilerEntries;
  export const useProfilerStats = useSurfaceProfilerStats;
  export const useProfilerSnapshot = useSurfaceProfilerSnapshot;
  export const aggregateProfilerStats = aggregateSurfaceProfilerStats;
  export const useProfilerClear = useSurfaceProfilerClear;

  export type Metric = SurfaceMetric;
  export const useMetrics = useSurfaceMetrics;
  export const clearMetrics = () => surfaceMetrics.clear();
  export type Mounted = MountedSurface;
  /** The surfaces mounted right now (dev builds, or under a profiler provider), without subscribing. */
  export const getMounted = getMountedSurfaces;
  /** The mounted surfaces, updated on mount and unmount. */
  export const useMounted = useMountedSurfaces;
  /** Selects a role's mounted surfaces for the highlight overlay and the Surfaces card. */
  export const select = setSelectedSurfaceRole;
  export const getSelected = getSelectedSurfaceRole;
  export const useSelected = useSelectedSurfaceRole;
  /** The current metrics without subscribing; see `useProfilerSnapshot`. */
  export const getMetrics = (): SurfaceMetric[] => [...surfaceMetrics.getSnapshot()];
}

export type { SurfaceProfilerEntry, SurfaceProfilerStats } from './SurfaceProfilerContext.tsx';
export type { SurfaceMetric } from './SurfaceMetrics.ts';
export { SurfaceManager } from './SurfaceManager.ts';
export { SurfaceManagerProvider, useSurfaceManager } from './SurfaceManagerContext.ts';
