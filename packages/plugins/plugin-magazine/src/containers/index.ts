//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const FeedArticle: ComponentType<any> = lazy(() => import('./FeedArticle'));
export const FeedProperties: ComponentType<any> = lazy(() => import('./FeedProperties'));
export const MagazineArticle: ComponentType<any> = lazy(() => import('./MagazineArticle'));
export const PostArticle: ComponentType<any> = lazy(() => import('./PostArticle'));
export const PostCard: ComponentType<any> = lazy(() => import('./PostCard'));
