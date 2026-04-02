//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Migrations = Capability.lazy('YouTubeMigrations', () => import('./migrations'));
