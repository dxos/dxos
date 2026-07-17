//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ArtifactArticle: ComponentType<any> = lazy(() => import('./ArtifactArticle'));
export const ArtifactsArticle: ComponentType<any> = lazy(() => import('./ArtifactsArticle'));
export const GalleryArticle: ComponentType<any> = lazy(() => import('./GalleryArticle'));
export const LightboxArticle: ComponentType<any> = lazy(() => import('./LightboxArticle'));
