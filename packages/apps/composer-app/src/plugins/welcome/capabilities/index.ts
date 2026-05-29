//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { type WelcomeOptions } from './capabilities';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const DefaultContent = Capability.lazy<WelcomeOptions>('DefaultContent', () => import('./default-content'));
export const Onboarding = Capability.lazy('Onboarding', () => import('./onboarding'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));

export * from './capabilities';
