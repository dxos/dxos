//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ArtifactArticle: ComponentType<any> = lazy(() => import('./ArtifactArticle/index.ts'));
export const ArtifactsArticle: ComponentType<any> = lazy(() => import('./ArtifactsArticle/index.ts'));
export const GalleryArticle: ComponentType<any> = lazy(() => import('./GalleryArticle/index.ts'));
export const LightboxArticle: ComponentType<any> = lazy(() => import('./LightboxArticle/index.ts'));
