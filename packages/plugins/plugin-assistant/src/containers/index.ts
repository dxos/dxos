//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const AgentArticle: ComponentType<any> = lazy(() => import('./AgentArticle'));
export const AgentProperties: ComponentType<any> = lazy(() => import('./AgentProperties'));
export const BlueprintArticle: ComponentType<any> = lazy(() => import('./BlueprintArticle'));
export const ChatCompanion: ComponentType<any> = lazy(() => import('./ChatCompanion'));
export const ChatArticle: ComponentType<any> = lazy(() => import('./ChatArticle'));
export const ChatDialog: ComponentType<any> = lazy(() => import('./ChatDialog'));
export const PlanArticle: ComponentType<any> = lazy(() => import('./PlanArticle'));
export const RoutineArticle: ComponentType<any> = lazy(() => import('./RoutineArticle'));
export const RoutineList: ComponentType<any> = lazy(() => import('./RoutineList'));
export const TracePanel: ComponentType<any> = lazy(() => import('./TracePanel'));
export const TriggerStatus: ComponentType<any> = lazy(() => import('./TriggerStatus'));
