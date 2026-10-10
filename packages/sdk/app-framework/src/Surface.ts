//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

export * from './ui/components/Surface/Surface.ts';
export {
  SurfaceManager as Manager,
  SurfaceManagerProvider as ManagerProvider,
  useSurfaceManager,
} from './ui/components/Surface/index.ts';
export type {
  SurfaceProfilerEntry as ProfilerEntry,
  SurfaceProfilerStats as ProfilerStats,
} from './ui/components/Surface/index.ts';
