//
// Copyright 2023 DXOS.org
//

import React from 'react';

export * from './FilesSettings';

// Lazily load components for content surfaces.
export const LocalFileMain = React.lazy(() => import('./LocalFileMain'));
