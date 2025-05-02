//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const IntentResolver = lazy(() => import('./intent-resolver'));
export const State = lazy(() => import('./state'));

export { LayoutState } from './state';
