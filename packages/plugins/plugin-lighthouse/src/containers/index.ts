//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ResearchArticle: ComponentType<any> = lazy(() => import('./ResearchArticle/index.ts'));
export const ResultArticle: ComponentType<any> = lazy(() => import('./ResultArticle/index.ts'));
export const LighthouseMetaArticle: ComponentType<any> = lazy(() => import('./LighthouseMetaArticle/index.ts'));
export const ResearchListArticle: ComponentType<any> = lazy(() => import('./ResearchListArticle/index.ts'));
