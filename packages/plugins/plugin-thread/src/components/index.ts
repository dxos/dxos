//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export const ChannelContainer = lazy(() => import('./ChannelContainer'));
export const ChatContainer = lazy(() => import('./ChatContainer'));

// TODO(wittjosiah): Suspense boundary for sidebar?
export * from './Call';
export * from './CallDebugPanel';
export * from './CallSidebar';
export * from './CommentsContainer';
export * from './CommentsThreadContainer';
export * from './MessageContainer';
export * from './ThreadComplementary';
export * from './ThreadSettings';
