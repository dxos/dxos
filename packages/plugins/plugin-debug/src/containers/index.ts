//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DebugGraph: ComponentType<any> = lazy(() => import('./DebugGraph'));
export const DebugObjectPanel: ComponentType<any> = lazy(() => import('./DebugObjectPanel'));
export const DebugSettings: ComponentType<any> = lazy(() => import('./DebugSettings'));
export const DebugStatus: ComponentType<any> = lazy(() => import('./DebugStatus'));
export const DevtoolsOverviewContainer: ComponentType<any> = lazy(() => import('./DevtoolsOverviewContainer'));
export const SpaceGenerator: ComponentType<any> = lazy(() => import('./SpaceGenerator'));
export const Wireframe: ComponentType<any> = lazy(() => import('./Wireframe'));
