//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const TriggerArticle = React.lazy(() => import('./TriggerContainer'));
export const TriggerSection = React.lazy(() => import('./TriggerSection'));
