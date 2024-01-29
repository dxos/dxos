//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const ThreadMain = React.lazy(() => import('./ThreadMain'));

// TODO(wittjosiah): Suspense boundary for sidebar?
export * from './ThreadMain';
export * from './ThreadSettings';
export * from './ThreadContainer';
export * from './MessageContainer';
