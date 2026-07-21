//
// Copyright 2026 DXOS.org
//

import { type ComponentType } from 'react';
import { lazy } from 'react';

export const FactsCompanion: ComponentType<any> = lazy(() => import('./FactsCompanion'));
export const TopicArticle: ComponentType<any> = lazy(() =>
  import('./TopicArticle').then((module) => ({ default: module.TopicArticle })),
);
