//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export const DebugApp = lazy(() => import('./DebugApp'));
export const DebugSpace = lazy(() => import('./DebugSpace'));

export * from './DebugObjectPanel';
export * from './DebugSettings';
export * from './DebugStatus';
export * from './Wireframe';
