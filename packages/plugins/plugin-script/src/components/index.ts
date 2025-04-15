//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './DebugPanel';
export * from './LogsPanel';
export * from './ScriptSettings';
export * from './ScriptSettingsPanel';

export const ScriptContainer = lazy(() => import('./ScriptContainer'));
