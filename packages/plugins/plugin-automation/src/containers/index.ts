//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const AutomationArticle: ComponentType<any> = lazy(() => import('./AutomationArticle'));
export const AutomationSettings: ComponentType<any> = lazy(() => import('./AutomationSettings'));
export const AutomationCompanion: ComponentType<any> = lazy(() => import('./AutomationCompanion'));
export const AutomationCompanionDeprecated: ComponentType<any> = lazy(() => import('./AutomationCompanionDeprecated'));
export const BlueprintArticle: ComponentType<any> = lazy(() => import('./BlueprintArticle'));
export const RoutineArticle: ComponentType<any> = lazy(() => import('./RoutineArticle'));
export const RoutineSuggestions: ComponentType<any> = lazy(() => import('./RoutineSuggestions'));
