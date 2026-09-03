//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type DebugPanelStatusProps } from './DebugPanelStatus';

export const DebugObjectPanel: ComponentType<any> = lazy(() => import('./DebugObjectPanel'));
export const DebugSettings: ComponentType<any> = lazy(() => import('./DebugSettings'));
export const DebugSpaceObjectsPanel: ComponentType<any> = lazy(() => import('./DebugSpaceObjectsPanel'));
export const DebugPanel: ComponentType<any> = lazy(() =>
  import('./DebugPanel').then((module) => ({ default: module.DebugPanel })),
);
export const DebugPanelStatus: ComponentType<DebugPanelStatusProps> = lazy(() =>
  import('./DebugPanelStatus').then((module) => ({ default: module.DebugPanelStatus })),
);
export const DebugStatus: ComponentType<any> = lazy(() => import('./DebugStatus'));
export const LoggerPanel: ComponentType<any> = lazy(() =>
  import('./LoggerPanel').then((module) => ({ default: module.LoggerPanel })),
);
export const SpaceGenerator: ComponentType<any> = lazy(() => import('./SpaceGenerator'));
export const Wireframe: ComponentType<any> = lazy(() => import('./Wireframe'));
export const StatsPanel: ComponentType<any> = lazy(() =>
  import('./StatsPanel').then((module) => ({ default: module.StatsPanel })),
);
