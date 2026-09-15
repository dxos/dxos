//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type DebugConsoleProps } from './DebugConsole/index.ts';
import { type DebugPanelDrawerProps } from './DebugPanelDrawer/index.ts';
import { type DebugPanelStatusProps } from './DebugPanelStatus/index.ts';

export const DebugConsole: ComponentType<DebugConsoleProps> = lazy(() =>
  import('./DebugConsole/index.ts').then((module) => ({ default: module.DebugConsole })),
);
export const DebugObjectPanel: ComponentType<any> = lazy(() => import('./DebugObjectPanel/index.ts'));
export const DebugSettings: ComponentType<any> = lazy(() => import('./DebugSettings/index.ts'));
export const DebugSpaceObjectsPanel: ComponentType<any> = lazy(() => import('./DebugSpaceObjectsPanel/index.ts'));
export const DebugPanelDrawer: ComponentType<DebugPanelDrawerProps> = lazy(() =>
  import('./DebugPanelDrawer/index.ts').then((module) => ({ default: module.DebugPanelDrawer })),
);
export const DebugPanelStatus: ComponentType<DebugPanelStatusProps> = lazy(() =>
  import('./DebugPanelStatus/index.ts').then((module) => ({ default: module.DebugPanelStatus })),
);
export const DebugStatus: ComponentType<any> = lazy(() => import('./DebugStatus/index.ts'));
export const LoggerPanel: ComponentType<any> = lazy(() =>
  import('./LoggerPanel/index.ts').then((module) => ({ default: module.LoggerPanel })),
);
export const SpaceGenerator: ComponentType<any> = lazy(() => import('./SpaceGenerator/index.ts'));
export const Wireframe: ComponentType<any> = lazy(() => import('./Wireframe/index.ts'));
export const StatsPanel: ComponentType<any> = lazy(() =>
  import('./StatsPanel/index.ts').then((module) => ({ default: module.StatsPanel })),
);
