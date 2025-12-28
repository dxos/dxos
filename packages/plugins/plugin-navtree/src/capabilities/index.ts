//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const Keyboard = Capability.lazy('Keyboard', () => import('./keyboard'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const State = Capability.lazy('State', () => import('./state'));

export * from './capabilities';
