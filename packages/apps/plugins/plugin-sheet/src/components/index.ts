//
// Copyright 2023 DXOS.org
//

import React from 'react';

// TODO(burdon): Rethink Main, Article, Section, etc. Esp. to row-span-2 (Deck).

// Lazily load components for content surfaces.
export const SheetArticle = React.lazy(() => import('./SheetArticle'));
export const SheetMain = React.lazy(() => import('./SheetMain'));
export const SheetSection = React.lazy(() => import('./SheetSection'));
