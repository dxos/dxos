//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const VideoArticle: ComponentType<any> = lazy(() => import('./VideoArticle'));
export const VideoSection: ComponentType<any> = lazy(() => import('./VideoSection'));
export const TranscriptSection: ComponentType<any> = lazy(() => import('./TranscriptSection'));
export const SummarySection: ComponentType<any> = lazy(() => import('./SummarySection'));
