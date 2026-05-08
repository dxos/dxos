//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const DailySummaryPlugin = Plugin.lazy(meta, () => import('./DailySummaryPlugin'));

export * from './meta';
