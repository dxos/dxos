//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const AutomationSettings: ComponentType<any> = lazy(() => import('./AutomationSettings'));
export const FunctionsContainer: ComponentType<any> = lazy(() => import('./FunctionsContainer'));
export const TriggerSettings: ComponentType<any> = lazy(() => import('./TriggerSettings'));
