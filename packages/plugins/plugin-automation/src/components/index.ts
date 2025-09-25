//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './TriggerEditor';

export const AutomationPanel = lazy(() => import('./AutomationPanel'));
export const AutomationSettings = lazy(() => import('./AutomationSettings'));
export const FunctionsContainer = lazy(() => import('./FunctionsContainer'));
export const FunctionsPanel = lazy(() => import('./FunctionsPanel'));
