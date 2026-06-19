//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './CreateAutomationPanel';
export * from './CronBuilder';
export * from './TemplateEditor';

export const RoutineProperties: ComponentType<any> = lazy(() => import('./RoutineProperties'));
