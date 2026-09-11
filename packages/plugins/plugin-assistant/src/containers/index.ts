//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const AgentArticle: ComponentType<any> = lazy(() => import('./AgentArticle/index.ts'));
export const AgentProperties: ComponentType<any> = lazy(() => import('./AgentProperties/index.ts'));
export const AssistantSettings: ComponentType<any> = lazy(() => import('./AssistantSettings/index.ts'));
export const ChatCompanion: ComponentType<any> = lazy(() => import('./ChatCompanion/index.ts'));
export const ChatArticle: ComponentType<any> = lazy(() => import('./ChatArticle/index.ts'));
export const ChatDialog: ComponentType<any> = lazy(() => import('./ChatDialog/index.ts'));
export const IntegrationPrompt: ComponentType<any> = lazy(() => import('./IntegrationPrompt/index.ts'));
export const PluginPrompt: ComponentType<any> = lazy(() => import('./PluginPrompt/index.ts'));
export const SpaceHomePrompt: ComponentType<any> = lazy(() => import('./SpaceHomePrompt/index.ts'));
export const SpaceHomeSuggestions: ComponentType<any> = lazy(() => import('./SpaceHomeSuggestions/index.ts'));
export const TracePanel: ComponentType<any> = lazy(() => import('./TracePanel/index.ts'));
export const TriggerStatus: ComponentType<any> = lazy(() => import('./TriggerStatus/index.ts'));
