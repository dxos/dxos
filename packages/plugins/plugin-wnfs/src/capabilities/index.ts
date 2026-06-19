//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Backend = Capability.lazy('Backend', () => import('./backend'));

export const Blockstore = Capability.lazy('Blockstore', () => import('./blockstore'));

export const UrlResolver = Capability.lazy('UrlResolver', () => import('./url-resolver'));
