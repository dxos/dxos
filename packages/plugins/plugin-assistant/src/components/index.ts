//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './AmbientDialog';
export * from './AssistantSettings';
export * from './Prompt';
export * from './PromptSettings';
export * from './TemplateEditor';
export * from './Thread';
export * from './Toolbox';

// TODO(burdon): Lazy loading causes issues with Tabster.
//  Repro: open assistant dialog then close.
//  https://github.com/microsoft/fluentui/issues/34020
export const AssistantDialog = lazy(() => import('./AssistantDialog'));
export const SequenceContainer = lazy(() => import('./SequenceContainer'));
export const ChatContainer = lazy(() => import('./ChatContainer'));
export const TemplateContainer = lazy(() => import('./TemplateContainer'));
