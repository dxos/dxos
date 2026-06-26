//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const CallManager = Capability.lazy('CallManager', () => import('./call-manager'));
export const CallTransport = Capability.lazy('CallTransport', () => import('./call-transport'));
export const ReactRoot = Capability.lazy('ReactRoot', () => import('./react-root'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
