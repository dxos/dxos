//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './ScriptSettings';

export const ScriptContainer = lazy(() => import('./ScriptContainer'));
export const AutomationPanel = lazy(() => import('./AutomationPanel'));
