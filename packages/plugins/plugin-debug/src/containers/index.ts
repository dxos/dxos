//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DebugObjectPanel: ComponentType<any> = lazy(() => import('./DebugObjectPanel'));
export const DebugSettings: ComponentType<any> = lazy(() => import('./DebugSettings'));
export const DebugSpaceObjectsPanel: ComponentType<any> = lazy(() => import('./DebugSpaceObjectsPanel'));
export const DebugStatus: ComponentType<any> = lazy(() => import('./DebugStatus'));
export const LogStatus: ComponentType<any> = lazy(() =>
  import('./LogStatus').then((module) => ({ default: module.LogStatus })),
);
export const SpaceGenerator: ComponentType<any> = lazy(() => import('./SpaceGenerator'));
export const Wireframe: ComponentType<any> = lazy(() => import('./Wireframe'));
export const StatsPanel: ComponentType<any> = lazy(() =>
  import('./StatsPanel').then((module) => ({ default: module.StatsPanel })),
);
