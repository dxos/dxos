//
// Copyright 2023 DXOS.org
//

import React from 'react';

// TODO(burdon): Rethink Main, Article, Section, etc.

// Lazily load components for content surfaces.
export const SheetMain = React.lazy(() => import('./SheetMain'));
export const SheetComponent = React.lazy(() => import('./SheetComponent'));
