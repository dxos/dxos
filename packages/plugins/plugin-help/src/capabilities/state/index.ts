//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const HelpState = Capability.lazy('HelpState', () => import('./state'));
