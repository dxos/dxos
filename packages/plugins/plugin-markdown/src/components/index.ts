//
// Copyright 2023 DXOS.org
//

import React from 'react';

export * from './DocumentEditor';
export * from './MarkdownEditor';
export * from './HeadingMenu';
export * from './Layout';
export * from './MarkdownSettings';

// Lazily load components for content surfaces.
export const MarkdownContainer = React.lazy(() => import('./MarkdownContainer'));
