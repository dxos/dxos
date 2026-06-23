//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const RoutineArticle: ComponentType<any> = lazy(() => import('./RoutineArticle'));
export const RoutineHistory: ComponentType<any> = lazy(() => import('./RoutineHistory'));
export const RoutineSettings: ComponentType<any> = lazy(() => import('./RoutineSettings'));
export const RoutineCompanion: ComponentType<any> = lazy(() => import('./RoutineCompanion'));
export const AutomationCompanionDeprecated: ComponentType<any> = lazy(() => import('./AutomationCompanionDeprecated'));
export const SkillArticle: ComponentType<any> = lazy(() => import('./SkillArticle'));
