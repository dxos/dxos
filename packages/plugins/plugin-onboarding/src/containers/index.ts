//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const SampleSettings: ComponentType<any> = lazy(() => import('./SampleSettings'));

/** Onboarding-only UI: loaded when its dialog renders rather than in every tab. */
export const WelcomeContainer: ComponentType<any> = lazy(() => import('./WelcomeContainer'));
