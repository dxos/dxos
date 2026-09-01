//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const VideoArticle: ComponentType<any> = lazy(() => import('./VideoArticle/index.ts'));
export const VideoSection: ComponentType<any> = lazy(() => import('./VideoSection/index.ts'));
export const TranscriptSection: ComponentType<any> = lazy(() => import('./TranscriptSection/index.ts'));
export const SummarySection: ComponentType<any> = lazy(() => import('./SummarySection/index.ts'));
