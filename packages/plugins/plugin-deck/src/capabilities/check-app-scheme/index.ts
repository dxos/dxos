//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const CheckAppScheme = Capability.lazy('CheckAppScheme', () => import('./check-app-scheme'));

