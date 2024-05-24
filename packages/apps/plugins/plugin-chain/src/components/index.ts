//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const ChainMain = React.lazy(() => import('./ChainMain'));
export const ChainArticle = React.lazy(() => import('./ChainArticle'));
export const TriggerArticle = React.lazy(() => import('./TriggerArticle'));
export const TriggerSection = React.lazy(() => import('./TriggerSection'));
