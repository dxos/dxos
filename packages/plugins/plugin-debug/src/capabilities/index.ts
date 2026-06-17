//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const ReactContext = Capability.lazy('ReactContext', () => import('./react-context'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const DebugSettings = Capability.lazy('DebugSettings', () => import('./settings'));
