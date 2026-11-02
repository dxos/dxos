//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CommentCount: ComponentType<any> = lazy(() => import('./CommentCount/index.ts'));
export const CommentsArticle: ComponentType<any> = lazy(() => import('./CommentsArticle/index.ts'));
export const CommentsCompanion: ComponentType<any> = lazy(() => import('./CommentsCompanion/index.ts'));
export const ObjectHistory: ComponentType<any> = lazy(() => import('./ObjectHistory/index.ts'));
