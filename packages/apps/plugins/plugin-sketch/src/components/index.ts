//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const SketchComponent = React.lazy(() => import('./Sketch'));
export const SketchMain = React.lazy(() => import('./SketchMain'));
