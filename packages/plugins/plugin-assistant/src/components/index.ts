//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './AssistantSettings';
export * from './BlueprintSettings';
export * from './Chat';
export * from './ChatProgress';
export * from './TemplateEditor';
export * from './Toolbar';
export * from './Toolbox';

export const BlueprintContainer = lazy(() => import('./BlueprintContainer'));
export const ChatCompanion = lazy(() => import('./ChatCompanion'));
export const ChatContainer = lazy(() => import('./ChatContainer'));
export const ChatDialog = lazy(() => import('./ChatDialog'));
export const SequenceContainer = lazy(() => import('./SequenceContainer'));
