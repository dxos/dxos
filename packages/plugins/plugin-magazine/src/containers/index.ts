//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const FeedArticle: ComponentType<any> = lazy(() => import('./FeedArticle/index.ts'));
export const FeedProperties: ComponentType<any> = lazy(() => import('./FeedProperties/index.ts'));
export const MagazineArticle: ComponentType<any> = lazy(() => import('./MagazineArticle/index.ts'));
export const PostArticle: ComponentType<any> = lazy(() => import('./PostArticle/index.ts'));
export const PostCard: ComponentType<any> = lazy(() => import('./PostCard/index.ts'));
