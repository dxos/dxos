//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './LogsPanel';
export * from './Settings';
export * from './TestPanel';

export const ScriptContainer = lazy(() => import('./ScriptContainer'));
