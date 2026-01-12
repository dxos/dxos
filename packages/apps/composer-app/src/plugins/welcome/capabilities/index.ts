//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const DefaultContent = Capability.lazy('DefaultContent', () => import('./default-content'));
export const Onboarding = Capability.lazy('Onboarding', () => import('./onboarding'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));

export * from './capabilities';
