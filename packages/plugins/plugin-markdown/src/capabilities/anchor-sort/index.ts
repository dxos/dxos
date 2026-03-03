//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AnchorSort = Capability.lazy('AnchorSort', () => import('./anchor-sort'));
