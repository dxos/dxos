//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const DebugGlobal = React.lazy(() => import('./DebugGlobal'));
export const DebugSpace = React.lazy(() => import('./DebugSpace'));
export const DevtoolsMain = React.lazy(() => import('./DevtoolsMain'));
export const DevtoolsArticle = React.lazy(() => import('./DevtoolsArticle'));
export const DebugStatus = React.lazy(() => import('./DebugStatus'));

export * from './DebugSettings';
