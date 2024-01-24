//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const ThreadMain = React.lazy(() => import('./ThreadMain'));

// TODO(wittjosiah): Suspense boundary for sidebar?
export * from './Chat';
export * from './Comments';
export * from './MessageCard';
export * from './MessageInput';
