//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const StackMain = React.lazy(() => import('./StackMain'));

export * from './StackSettings';
export * from './AddSectionDialog';
