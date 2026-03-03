//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SettingsAppGraphBuilder = Capability.lazy('SettingsAppGraphBuilder', () => import('./app-graph-builder'));
