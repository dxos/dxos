//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ClientReady = Capability.lazy('ClientReady', () => import('./client-ready'));

