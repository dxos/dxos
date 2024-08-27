//
// Copyright 2023 DXOS.org
//

import React from 'react';

export * from './ComputeGraph';

// Lazily load components for content surfaces.
export const Sheet = React.lazy(() => import('./SheetWrapper'));
