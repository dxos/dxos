//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './AssistantSettings';
export * from './ServiceRegistry';
export * from './TemplateEditor';
export * from './Thread';
export * from './Toolbox';

export const AssistantDialog = lazy(() => import('./AssistantDialog'));
export const ChatContainer = lazy(() => import('./ChatContainer'));
export const TemplateContainer = lazy(() => import('./TemplateContainer'));
