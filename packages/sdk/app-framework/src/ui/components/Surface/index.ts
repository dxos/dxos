//
// Copyright 2025 DXOS.org
//

import { Role } from '../../../common/index.ts';
import { SurfaceContext } from './context.ts';
import { SurfaceComponent, useIsSurfaceAvailable } from './SurfaceComponent.tsx';
import { isSurfaceDebugEnabled, setSurfaceDebug } from './SurfaceDebug.tsx';
import { type SurfaceMetric, surfaceMetrics, useSurfaceMetrics } from './SurfaceMetrics.ts';
import {
  SurfaceProfilerProvider,
  useSurfaceProfilerCallback,
  useSurfaceProfilerClear,
  useSurfaceProfilerEntries,
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
  export const useProfilerClear = useSurfaceProfilerClear;

  export type Metric = SurfaceMetric;
  export const useMetrics = useSurfaceMetrics;
  export const clearMetrics = () => surfaceMetrics.clear();
}

export type { SurfaceProfilerEntry, SurfaceProfilerStats } from './SurfaceProfilerContext.tsx';
export type { SurfaceMetric } from './SurfaceMetrics.ts';
export { SurfaceManager } from './SurfaceManager.ts';
export { SurfaceManagerProvider, useSurfaceManager } from './SurfaceManagerContext.ts';
