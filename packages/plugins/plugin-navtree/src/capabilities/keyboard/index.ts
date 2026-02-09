//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Keyboard = Capability.lazy('Keyboard', () => import('./keyboard'));
