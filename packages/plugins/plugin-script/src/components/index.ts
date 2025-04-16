//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './LogsPanel';
export * from './ScriptSettings';
export * from './TestPanel';

export const ScriptContainer = lazy(() => import('./ScriptContainer'));
