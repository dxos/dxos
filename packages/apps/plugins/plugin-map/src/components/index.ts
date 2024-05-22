//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const MapMain = React.lazy(() => import('./MapMain'));
export const MapSection = React.lazy(() => import('./MapSection'));
export const MapArticle = React.lazy(() => import('./MapArticle'));

export * from './MapSection';
