//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const IntentResolvers = lazy(() => import('./intent-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const ExcalidrawSettings = lazy(() => import('./settings'));
