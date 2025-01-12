//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const CheckAppScheme = lazy(() => import('./check-app-scheme'));
export const LocationState = lazy(() => import('./location'));
export const NavigationIntents = lazy(() => import('./intents'));
export const Url = lazy(() => import('./url'));
