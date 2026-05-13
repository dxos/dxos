//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const PresenterSettings = Capability.lazy('PresenterSettings', () => import('./settings'));
