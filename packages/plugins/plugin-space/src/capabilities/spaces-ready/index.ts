//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SpacesReady = Capability.lazy('SpacesReady', () => import('./spaces-ready'));
