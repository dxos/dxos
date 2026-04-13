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
import { type Definition as SurfaceDefinition, create as createSurface, createWeb as createWebSurface } from './types';

export namespace Surface {
  export type Definition = SurfaceDefinition;
  export const create = createSurface;
  export const createWeb = createWebSurface;

  export type Context = SurfaceContext;
  export const Context = SurfaceContext;

  export const Surface = SurfaceComponent;
  export const isAvailable = isSurfaceAvailable;

  export const ProfilerProvider = SurfaceProfilerProvider;
  export const useProfilerCallback = useSurfaceProfilerCallback;
  export const useProfilerEntries = useSurfaceProfilerEntries;
  export const useProfilerStats = useSurfaceProfilerStats;
  export const useProfilerClear = useSurfaceProfilerClear;
}

export type { SurfaceProfilerEntry, SurfaceProfilerStats } from './SurfaceProfilerContext';
