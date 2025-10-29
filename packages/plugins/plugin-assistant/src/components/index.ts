//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './AssistantSettings';
export * from './Chat';
export * from './ChatProgress';
export * from './ChatToolbar';
export * from './TemplateEditor';
export * from './Toolbox';

export const BlueprintContainer = lazy(() => import('./BlueprintContainer'));
export const ChatCompanion = lazy(() => import('./ChatCompanion'));
export const ChatContainer = lazy(() => import('./ChatContainer'));
export const ChatDialog = lazy(() => import('./ChatDialog'));
