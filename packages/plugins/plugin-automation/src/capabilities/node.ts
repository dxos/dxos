//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const LayerSpecs = Capability.lazy<void, Capability.Any[]>('LayerSpecs', () => import('./layer-specs'));
