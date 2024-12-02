//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export const ThreadMain = lazy(() => import('./ThreadMain'));
export const ThreadArticle = lazy(() => import('./ThreadArticle'));
export const AssistantComplimentary = lazy(() => import('./assistant/AssistantComplimentary'));

// TODO(wittjosiah): Suspense boundary for sidebar?
export * from './CommentContainer';
export * from './CommentsContainer';
export * from './ChatContainer';
export * from './MessageContainer';
export * from './ThreadComplementary';
export * from './ThreadSettings';
