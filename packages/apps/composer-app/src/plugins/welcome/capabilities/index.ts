//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const DefaultContent = lazy(() => import('./default-content'));
export const Onboarding = lazy(() => import('./onboarding'));
export const ReactSurface = lazy(() => import('./react-surface'));

export * from './capabilities';
