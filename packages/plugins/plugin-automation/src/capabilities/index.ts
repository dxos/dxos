//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const ComputeRuntime = Capability.lazy('ComputeRuntime', () => import('./compute-runtime'));
export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));

export * from './capabilities';
