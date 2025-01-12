//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const ClientReady = lazy(() => import('./client-ready'));
export const IntentResolver = lazy(() => import('./intents-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const ObservabilitySettings = lazy(() => import('./settings'));
export const ObservabilityState = lazy(() => import('./state'));

export { ObservabilityCapabilities } from './capabilities';
