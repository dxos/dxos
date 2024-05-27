//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const RevealMain = React.lazy(() => import('./RevealMain'));
export const PresenterMain = React.lazy(() => import('./PresenterMain'));
export const MarkdownSlide = React.lazy(() => import('./MarkdownSlide'));
