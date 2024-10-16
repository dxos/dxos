//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const ThreadMain = React.lazy(() => import('./ThreadMain'));
export const ThreadArticle = React.lazy(() => import('./ThreadArticle'));

// TODO(wittjosiah): Suspense boundary for sidebar?
export * from './CommentContainer';
export * from './CommentsContainer';
export * from './ChatContainer';
export * from './MessageContainer';
export * from './ThreadComplementary';
export * from './ThreadSettings';
