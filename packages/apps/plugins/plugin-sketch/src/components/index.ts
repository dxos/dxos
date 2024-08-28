//
// Copyright 2023 DXOS.org
//

import React from 'react';

export * from './SketchSettings';

// Lazily load components for content surfaces.
export const SketchContainer = React.lazy(() => import('./Sketch'));
