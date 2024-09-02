//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const FileCard = React.lazy(() => import('./FileCard'));
export const FileMain = React.lazy(() => import('./FileMain'));
export const FileSection = React.lazy(() => import('./FileSection'));
export const FileSlide = React.lazy(() => import('./FileSlide'));
