//
// Copyright 2023 DXOS.org
//

import { type LazyExoticComponent, lazy } from 'react';

export * from './AssistantSettings';
export * from './Chat';
export * from './TemplateEditor';
export * from './Toolbox';
export * from './TriggerStatus';
export * from './Initiative';

export const BlueprintArticle = lazy(() => import('./BlueprintArticle'));
export const ChatCompanion = lazy(() => import('./ChatCompanion'));
// Type annotation needed to avoid declaration file emission issues with @dxos/assistant-toolkit types.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export const ChatContainer: LazyExoticComponent<typeof import('./ChatContainer').default> = lazy(
  () => import('./ChatContainer'),
);
export const ChatDialog = lazy(() => import('./ChatDialog'));
export const PromptArticle = lazy(() => import('./PromptArticle'));

export type { ChatContainerProps } from './ChatContainer';
export type { ChatDialogProps } from './ChatDialog';
