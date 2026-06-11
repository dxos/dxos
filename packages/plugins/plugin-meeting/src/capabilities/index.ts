//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';
import { type CallsCapabilities } from '@dxos/plugin-calls/types';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
// The contributed capability is declared in @dxos/plugin-calls, so the lazy wrapper needs an
// explicit annotation to keep the inferred type portable (TS2742/TS2883).
export const CallExtension: Capability.LazyCapability<
  void,
  Capability.Capability<typeof CallsCapabilities.EventHandler>
> = Capability.lazy('CallExtension', () => import('./call-extension'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const MeetingSettings = Capability.lazy('MeetingSettings', () => import('./settings'));
export const MeetingState = Capability.lazy('MeetingState', () => import('./state'));
