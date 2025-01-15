//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export const ThreadContainer = lazy(() => import('./ThreadContainer'));

// TODO(wittjosiah): Suspense boundary for sidebar?
export * from './CommentContainer';
export * from './CommentsContainer';
export * from './ChatContainer';
export * from './MessageContainer';
export * from './ThreadComplementary';
export * from './ThreadSettings';
