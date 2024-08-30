//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const TableMain = React.lazy(() => import('./TableMain'));
export const TableSection = React.lazy(() => import('./TableSection'));
export const TableSlide = React.lazy(() => import('./TableSlide'));
export const TableArticle = React.lazy(() => import('./TableArticle'));
