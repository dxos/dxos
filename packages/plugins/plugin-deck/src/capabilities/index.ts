//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const ReactSurface = lazy(() => import('./react-surface'));
export const DeckSettings = lazy(() => import('./settings'));

export * from './capabilities';
export * from './layout';
export * from './navigation';
