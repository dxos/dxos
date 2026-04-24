//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const FeedArticle: ComponentType<any> = lazy(() => import('./FeedArticle'));
export const MagazineArticle: ComponentType<any> = lazy(() => import('./MagazineArticle'));
export const PostArticle: ComponentType<any> = lazy(() => import('./PostArticle'));
export const SubscriptionsArticle: ComponentType<any> = lazy(() => import('./SubscriptionsArticle'));
