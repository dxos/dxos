//
// Copyright 2025 DXOS.org
//

// TODO(wittjosiah): Cleanup to avoid re-naming.
import { SurfaceContext } from './context';
import { SurfaceComponent, isSurfaceAvailable } from './SurfaceComponent';
import {
  SurfaceProfilerProvider,
  useSurfaceProfilerCallback,
  useSurfaceProfilerClear,
  useSurfaceProfilerEntries,
  useSurfaceProfilerStats,
} from './SurfaceProfilerContext';
import {
  type Definition as SurfaceDefinition,
  type RoleToken as SurfaceRoleToken,
  type SurfaceBinding as SurfaceBindingType,
  type SurfaceFilter as SurfaceFilterType,
  type TokenData as SurfaceTokenData,
  type TypedProps as SurfaceTypedProps,
  create as createSurface,
  createWeb as createWebSurface,
  isSurfaceFilter as isSurfaceFilterFn,
  makeType as makeTypeFn,
} from './types';

export namespace Surface {
  export type Definition = SurfaceDefinition;
  export const create = createSurface;
  export const createWeb = createWebSurface;

  export type Context = SurfaceContext;
  export const Context = SurfaceContext;

  export const Surface = SurfaceComponent;
  export const isAvailable = isSurfaceAvailable;

  export type RoleToken<TData> = SurfaceRoleToken<TData>;
  export type Binding = SurfaceBindingType;
  export type Filter<TData> = SurfaceFilterType<TData>;
  export type TokenData<T> = SurfaceTokenData<T>;
  export type TypedProps<TToken extends SurfaceRoleToken<any>> = SurfaceTypedProps<TToken>;
  export const makeType = makeTypeFn;
  export const isFilter = isSurfaceFilterFn;

  export const ProfilerProvider = SurfaceProfilerProvider;
  export const useProfilerCallback = useSurfaceProfilerCallback;
  export const useProfilerEntries = useSurfaceProfilerEntries;
  export const useProfilerStats = useSurfaceProfilerStats;
  export const useProfilerClear = useSurfaceProfilerClear;
}

export type { SurfaceProfilerEntry, SurfaceProfilerStats } from './SurfaceProfilerContext';
