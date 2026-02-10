//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
