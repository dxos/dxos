//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './TriggerEditor';

export const AutomationPanel = lazy(() => import('./AutomationPanel'));
export const FunctionsPanel = lazy(() => import('./FunctionsPanel'));
export const FunctionsRegistry = lazy(() => import('./FunctionsRegistry'));
