//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const DebugGlobal = React.lazy(() => import('./DebugGlobal'));
export const DebugSpace = React.lazy(() => import('./DebugSpace'));

export * from './DebugSettings';
export * from './DebugStatus';
export * from './Wireframe';
