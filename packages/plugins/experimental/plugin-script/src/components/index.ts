//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './ScriptSettings';
export * from './ScriptSettingsPanel';

export const AutomationPanel = lazy(() => import('./AutomationPanel'));
export const ScriptContainer = lazy(() => import('./ScriptContainer'));
