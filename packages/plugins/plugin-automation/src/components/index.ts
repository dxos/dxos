//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './TriggerEditor';

export const AutomationContainer = lazy(() => import('./AutomationContainer'));
export const AutomationPanel = lazy(() => import('./AutomationPanel'));
export const FunctionsContainer = lazy(() => import('./FunctionsContainer'));
export const FunctionsPanel = lazy(() => import('./FunctionsPanel'));
