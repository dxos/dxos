//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export const DebugGlobal = lazy(() => import('./DebugGlobal'));
export const DebugSpace = lazy(() => import('./DebugSpace'));

export * from './DebugObjectPanel';
export * from './DebugSettings';
export * from './DebugStatus';
export * from './Wireframe';
