//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export const DebugGraph = lazy(() => import('./DebugGraph'));
export const DevtoolsOverviewContainer = lazy(() => import('./DevtoolsOverviewContainer'));
export const SpaceGenerator = lazy(() => import('./SpaceGenerator'));

export * from './DebugObjectPanel';
export * from './DebugSettings';
export * from './DebugStatus';
export * from './Wireframe';
