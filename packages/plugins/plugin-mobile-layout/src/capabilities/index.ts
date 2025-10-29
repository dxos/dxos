//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const IntentResolver = lazy(() => import('./intent-resolver'));
export const ReactRoot = lazy(() => import('./react-root'));
export const State = lazy(() => import('./state'));

export { MobileLayoutState } from './state';
