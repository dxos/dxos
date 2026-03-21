//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const DailySummarySettings = Capability.lazy('DailySummarySettings', () => import('./settings'));
