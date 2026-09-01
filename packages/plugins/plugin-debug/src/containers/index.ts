//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type DebugPortStatusProps } from './DebugPortStatus/index.ts';

export const DebugObjectPanel: ComponentType<any> = lazy(() => import('./DebugObjectPanel/index.ts'));
export const DebugSettings: ComponentType<any> = lazy(() => import('./DebugSettings/index.ts'));
export const DebugSpaceObjectsPanel: ComponentType<any> = lazy(() => import('./DebugSpaceObjectsPanel/index.ts'));
export const DebugPortStatus: ComponentType<DebugPortStatusProps> = lazy(() =>
  import('./DebugPortStatus/index.ts').then((module) => ({ default: module.DebugPortStatus })),
);
export const DebugStatus: ComponentType<any> = lazy(() => import('./DebugStatus/index.ts'));
export const LogStatus: ComponentType<any> = lazy(() =>
  import('./LogStatus/index.ts').then((module) => ({ default: module.LogStatus })),
);
export const SpaceGenerator: ComponentType<any> = lazy(() => import('./SpaceGenerator/index.ts'));
export const Wireframe: ComponentType<any> = lazy(() => import('./Wireframe/index.ts'));
export const StatsPanel: ComponentType<any> = lazy(() =>
  import('./StatsPanel/index.ts').then((module) => ({ default: module.StatsPanel })),
);
