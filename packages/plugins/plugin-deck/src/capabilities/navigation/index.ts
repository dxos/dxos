//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const CheckAppScheme = lazy(() => import('./check-app-scheme'));
export const LocationState = lazy(() => import('./location'));
export const NavigationIntentResolver = lazy(() => import('./intent-resolver'));
export const UrlHandler = lazy(() => import('./url-handler'));
