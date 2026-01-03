//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';
import { type FC } from 'react';

import { type DebugGraphProps } from './DebugGraph';

export const DebugGraph: ReturnType<typeof lazy<FC<DebugGraphProps>>> = lazy(() => import('./DebugGraph'));
export const DevtoolsOverviewContainer = lazy(() => import('./DevtoolsOverviewContainer'));
export const SpaceGenerator = lazy(() => import('./SpaceGenerator'));

export * from './DebugObjectPanel';
export * from './DebugSettings';
export * from './DebugStatus';
export * from './Wireframe';
