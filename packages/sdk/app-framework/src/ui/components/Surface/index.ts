//
// Copyright 2025 DXOS.org
//

import * as Role from '../../../common/Role';
// TODO(wittjosiah): Cleanup to avoid re-naming.
import { SurfaceContext } from './context';
import { SurfaceComponent, useIsSurfaceAvailable } from './SurfaceComponent';
import { isSurfaceDebugEnabled, setSurfaceDebug } from './SurfaceDebug';
import { type SurfaceMetric, surfaceMetrics, useSurfaceMetrics } from './SurfaceMetrics';
import {
  SurfaceProfilerProvider,
  useSurfaceProfilerCallback,
  useSurfaceProfilerClear,
  useSurfaceProfilerEntries,
  useSurfaceProfilerStats,
} from './SurfaceProfilerContext';
import {
  type Binding as SurfaceBindingType,
  type Definition as SurfaceDefinition,
  type Filter as SurfaceFilterType,
  type TypedProps as SurfaceTypedProps,
  create as createSurface,
  createWeb as createWebSurface,
  isFilter as isFilterFn,
  makeFilter as makeFilterFn,
} from './types';

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

  export const isDebugEnabled = isSurfaceDebugEnabled;
  export const setDebug = setSurfaceDebug;

  export const ProfilerProvider = SurfaceProfilerProvider;
  export const useProfilerCallback = useSurfaceProfilerCallback;
  export const useProfilerEntries = useSurfaceProfilerEntries;
  export const useProfilerStats = useSurfaceProfilerStats;
  export const useProfilerClear = useSurfaceProfilerClear;

  export type Metric = SurfaceMetric;
  export const useMetrics = useSurfaceMetrics;
  export const clearMetrics = () => surfaceMetrics.clear();
}

export type { SurfaceProfilerEntry, SurfaceProfilerStats } from './SurfaceProfilerContext';
export type { SurfaceMetric } from './SurfaceMetrics';
export { SurfaceManager } from './SurfaceManager';
export { SurfaceManagerProvider, useSurfaceManager } from './SurfaceManagerContext';
