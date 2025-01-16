//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const Compiler = lazy(() => import('./compiler'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));

export * from './capabilities';
