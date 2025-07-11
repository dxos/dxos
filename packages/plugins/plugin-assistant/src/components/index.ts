//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './AssistantSettings';
export * from './Chat';
export * from './PromptSettings';
export * from './TemplateEditor';
export * from './Toolbox';

// TODO(burdon): Lazy loading causes issues with Tabster.
//  Repro: open assistant dialog then close.
//  https://github.com/microsoft/fluentui/issues/34020

export const ChatContainer = lazy(() => import('./ChatContainer'));
export const ChatDialog = lazy(() => import('./ChatDialog'));
export const SequenceContainer = lazy(() => import('./SequenceContainer'));
export const TemplateContainer = lazy(() => import('./TemplateContainer'));
