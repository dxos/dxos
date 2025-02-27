//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './AmbientChatDialog';
export * from './AutomationPanel';
export * from './ChatContainer';
export * from './MarkdownViewer';
export * from './PromptEditor';
export * from './ServiceRegistry';
export * from './Thread';
export * from './TriggerEditor';

export const AutomationPanel = lazy(() => import('./AutomationPanel'));
export const ChatContainer = lazy(() => import('./ChatContainer'));
