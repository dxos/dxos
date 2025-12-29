//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const DeckSettings = Capability.lazy('DeckSettings', () => import('./settings'));

