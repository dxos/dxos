//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type OperationHandlerSet } from '@dxos/compute';

import { type WelcomeOptions } from './capabilities';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const DefaultContent = Capability.lazy<WelcomeOptions>('DefaultContent', () => import('./default-content'));
export const OAuthRecoveryRedirect = Capability.lazy('OAuthRecoveryRedirect', () => import('./oauth-recovery-redirect'));
export const Onboarding = Capability.lazy('Onboarding', () => import('./onboarding'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));

export * from './capabilities';
