//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './Project';

export const AssistantSettings: ComponentType<any> = lazy(() => import('./AssistantSettings'));
export const BlueprintArticle: ComponentType<any> = lazy(() => import('./BlueprintArticle'));
export const ChatCompanion: ComponentType<any> = lazy(() => import('./ChatCompanion'));
export const ChatContainer: ComponentType<any> = lazy(() => import('./ChatContainer'));
export const ChatDialog: ComponentType<any> = lazy(() => import('./ChatDialog'));
export const PromptArticle: ComponentType<any> = lazy(() => import('./PromptArticle'));
export const TracePanel: ComponentType<any> = lazy(() => import('./TracePanel'));
export const TriggerStatus: ComponentType<any> = lazy(() => import('./TriggerStatus'));
