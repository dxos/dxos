//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const BlobBackend = Capability.lazy('BlobBackend', () => import('./blob-backend'));

export const Blockstore = Capability.lazy('Blockstore', () => import('./blockstore'));
