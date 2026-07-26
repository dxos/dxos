//
// Copyright 2025 DXOS.org
//

import { Role } from '../../../common';
import { isSurfaceBoundaryRole, setSurfaceBoundaryRoles, useSurfaceBoundaryScope } from './boundary';
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
  DX_SURFACE_ROOT_TAG,
  SURFACE_ROOT_MOUNTED_EVENT,
  SURFACE_ROOT_UNMOUNTED_EVENT,
  registerSurfaceRootElement,
} from './SurfaceRootElement';
import { SurfaceRootProviders } from './SurfaceRootProviders';
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

  // Web-component boundary dispatch (see boundary.ts / SurfaceRootElement.tsx).
  export const registerRootElement = registerSurfaceRootElement;
  export const setBoundaryRoles = setSurfaceBoundaryRoles;
  export const isBoundaryRole = isSurfaceBoundaryRole;
  export const useBoundaryScope = useSurfaceBoundaryScope;
  export const RootProviders = SurfaceRootProviders;
  export const ROOT_TAG = DX_SURFACE_ROOT_TAG;
  export const ROOT_MOUNTED_EVENT = SURFACE_ROOT_MOUNTED_EVENT;
  export const ROOT_UNMOUNTED_EVENT = SURFACE_ROOT_UNMOUNTED_EVENT;

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
