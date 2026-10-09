//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const RoutineArticle: ComponentType<any> = lazy(() => import('./RoutineArticle/index.ts'));
export const RoutineTraceCompanion: ComponentType<any> = lazy(() => import('./RoutineTraceCompanion/index.ts'));
export const RoutineSettings: ComponentType<any> = lazy(() => import('./RoutineSettings/index.ts'));
export const SkillArticle: ComponentType<any> = lazy(() => import('./SkillArticle/index.ts'));
