//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const IntentResolver = lazy(() => import('./intent-resolver'));
export const Keyboard = lazy(() => import('./keyboard'));
export const ReactContext = lazy(() => import('./react-context'));

export * from './capabilities';
