//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Toolkit = Capability.lazy('Toolkit', () => import('./toolkit'));

