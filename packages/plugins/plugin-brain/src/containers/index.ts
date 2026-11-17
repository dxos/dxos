//
// Copyright 2026 DXOS.org
//

import { type ComponentType } from 'react';
import { lazy } from 'react';

export const FactsCompanion: ComponentType<any> = lazy(() => import('./FactsCompanion/index.ts'));
export const MemoryArticle: ComponentType<any> = lazy(() => import('./MemoryArticle/index.ts'));
export const PipelineCompanion: ComponentType<any> = lazy(() => import('./PipelineCompanion/index.ts'));
