//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Migrations = Capability.lazy('OutlinerMigrations', () => import('./migrations'));
