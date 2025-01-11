//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework/next';

export const IdentityCreated = lazy(() => import('./identity-created'));
export const Onboarding = lazy(() => import('./onboarding'));
export const ReactSurface = lazy(() => import('./react-surface'));

export * from './capabilities';
