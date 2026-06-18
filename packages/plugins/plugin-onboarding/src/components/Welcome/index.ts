//
// Copyright 2024 DXOS.org
//

import { lazy } from 'react';

export { OVERLAY_CLASSES, OVERLAY_STYLE } from './Welcome';
export * from './types';

export const Welcome = lazy(() => import('./Welcome'));
