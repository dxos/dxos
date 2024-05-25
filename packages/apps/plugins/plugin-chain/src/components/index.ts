//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const ChainArticle = React.lazy(() => import('./ChainArticle'));

export * from './Chain';
export * from './PromptTemplate';
