//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export const ChatContainer = lazy(() => import('./ChatContainer'));

// TODO(wittjosiah): Suspense boundary for sidebar?
export * from './CommentContainer';
export * from './CommentsContainer';
export * from './MessageContainer';
export * from './ThreadComplementary';
export * from './ThreadSettings';
