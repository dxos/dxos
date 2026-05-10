//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const DoctorPlugin = Plugin.lazy(meta, () => import('./DoctorPlugin'));

export * from './meta';
