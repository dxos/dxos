//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const AgentArticle: ComponentType<any> = lazy(() => import('./AgentArticle'));
export const AgentProperties: ComponentType<any> = lazy(() => import('./AgentProperties'));
export const AssistantSettings: ComponentType<any> = lazy(() => import('./AssistantSettings'));
export const ChatCompanion: ComponentType<any> = lazy(() => import('./ChatCompanion'));
export const ChatArticle: ComponentType<any> = lazy(() => import('./ChatArticle'));
export const ChatDialog: ComponentType<any> = lazy(() => import('./ChatDialog'));
export const IntegrationPrompt: ComponentType<any> = lazy(() => import('./IntegrationPrompt'));
export const PlanArticle: ComponentType<any> = lazy(() => import('./PlanArticle'));
export const SpaceHomePrompt: ComponentType<any> = lazy(() => import('./SpaceHomePrompt'));
export const SpaceHomeSuggestions: ComponentType<any> = lazy(() => import('./SpaceHomeSuggestions'));
export const TracePanel: ComponentType<any> = lazy(() => import('./TracePanel'));
export const TriggerStatus: ComponentType<any> = lazy(() => import('./TriggerStatus'));
