//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './PromptEditor';
export * from './Thread';
export * from './TriggerEditor';

export const AssistantPanel = lazy(() => import('./AssistantPanel'));
export const AutomationPanel = lazy(() => import('./AutomationPanel'));
