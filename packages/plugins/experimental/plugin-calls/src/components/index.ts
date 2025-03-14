//
// Copyright 2023 DXOS.org
//

import React from 'react';

export * from './CallGlobalContextProvider';

export const CallContainer = React.lazy(() => import('./CallContainer'));
export const CallSidebar = React.lazy(() => import('./CallSidebar'));
