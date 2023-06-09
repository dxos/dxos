//
// Copyright 2023 DXOS.org
//

import React from 'react';

export * from './router';

export const ConfigPage = React.lazy(() => import('../routes/Config'));
export const RegistryPage = React.lazy(() => import('../routes/Registry'));
export const StatusPage = React.lazy(() => import('../routes/Status'));
