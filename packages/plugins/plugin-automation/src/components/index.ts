//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './AutomationForm';
export * from './CreateAutomationPanel';
export * from './Schedule';
export * from './TemplateEditor';
export * from './TriggerEditor';

export const RoutineProperties: ComponentType<any> = lazy(() => import('./RoutineProperties'));
