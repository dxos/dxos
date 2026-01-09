//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphSerializer = Capability.lazy('AppGraphSerializer', () => import('./app-graph-serializer'));
