//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const MediaArtifactArticle: ComponentType<any> = lazy(() => import('./MediaArtifactArticle/index.ts'));
export const StoryboardArticle: ComponentType<any> = lazy(() => import('./StoryboardArticle/index.ts'));
export const GalleryArticle: ComponentType<any> = lazy(() => import('./GalleryArticle/index.ts'));
export const LightboxArticle: ComponentType<any> = lazy(() => import('./LightboxArticle/index.ts'));
