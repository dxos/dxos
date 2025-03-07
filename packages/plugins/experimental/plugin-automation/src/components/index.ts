//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './AssistantDialog';
export * from './AutomationPanel';
export * from './ChatContainer';
export * from './ServiceRegistry';
export * from './TemplateEditor';
export * from './Thread';
export * from './TriggerEditor';
export * from './Toolbox';

export const AutomationPanel = lazy(() => import('./AutomationPanel'));
export const ChatContainer = lazy(() => import('./ChatContainer'));
export const TemplateContainer = lazy(() => import('./TemplateContainer'));
