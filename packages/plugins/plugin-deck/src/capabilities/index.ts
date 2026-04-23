//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const CheckAppScheme = Capability.lazy('CheckAppScheme', () => import('./check-app-scheme'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactRoot = Capability.lazy('ReactRoot', () => import('./react-root'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const DeckSettings = Capability.lazy('DeckSettings', () => import('./settings'));
export const DeckState = Capability.lazy('DeckState', () => import('./state'));
export const UrlHandler = Capability.lazy('UrlHandler', () => import('./url-handler'));
