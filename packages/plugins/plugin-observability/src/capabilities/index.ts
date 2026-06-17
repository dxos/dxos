//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

import type { ClientReadyOptions } from './client-ready';

export const ClientReady = Capability.lazy<ClientReadyOptions>('ClientReady', () => import('./client-ready'));
export const PrivacyNotice = Capability.lazy('PrivacyNotice', () => import('./privacy-notice'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
// Explicit annotation prevents TS2883: the module contributes AppCapabilities.Settings whose type
// traces to an internal source path that TypeScript cannot name in declaration files.
export const ObservabilitySettings: Capability.LazyCapability = Capability.lazy(
  'ObservabilitySettings',
  () => import('./settings'),
);
export const ObservabilityState = Capability.lazy('ObservabilityState', () => import('./state'));
