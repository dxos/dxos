//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const ExplorerMain = React.lazy(() => import('./ExplorerMain'));
export const ExplorerArticle = React.lazy(() => import('./ExplorerArticle'));

export * from './Chart';
export * from './Globe';
export * from './Graph';
export * from './Tree';
