//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const BookmarkArticle: ComponentType<any> = lazy(() => import('./BookmarkArticle/index.ts'));
export const BookmarkCard: ComponentType<any> = lazy(() => import('./BookmarkCard/index.ts'));
