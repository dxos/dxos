//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ExemplarSettings: ComponentType<any> = lazy(() => import('./ExemplarSettings'));

/** Onboarding-only UI: loaded when its dialog renders rather than in every tab. */
export const WelcomeContainer: ComponentType<any> = lazy(() => import('./WelcomeContainer'));
