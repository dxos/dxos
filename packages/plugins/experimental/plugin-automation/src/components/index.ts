//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './AutomationPanel';
export * from './AutomationSettings';
export * from './ServiceRegistry';
export * from './TemplateEditor';
export * from './Thread';
export * from './TriggerEditor';
export * from './Toolbox';

export const AssistantDialog = lazy(() => import('./AssistantDialog'));
export const AutomationPanel = lazy(() => import('./AutomationPanel'));
export const ChatContainer = lazy(() => import('./ChatContainer'));
export const TemplateContainer = lazy(() => import('./TemplateContainer'));
