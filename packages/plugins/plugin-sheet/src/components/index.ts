//
// Copyright 2023 DXOS.org
//

import React from 'react';

export * from './ComputeGraph';

// Lazily load components for content surfaces.
export const SheetContainer = React.lazy(() => import('./SheetContainer'));
