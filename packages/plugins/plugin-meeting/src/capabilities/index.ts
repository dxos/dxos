//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const CallExtension = Capability.lazy('CallExtension', () => import('./call-extension'));
export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Repair = Capability.lazy('Repair', () => import('./repair'));
export const MeetingSettings = Capability.lazy('MeetingSettings', () => import('./settings'));
export const MeetingState = Capability.lazy('MeetingState', () => import('./state'));
