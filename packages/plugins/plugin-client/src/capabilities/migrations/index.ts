//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Migrations = Capability.lazy('Migrations', () => import('./migrations'));
