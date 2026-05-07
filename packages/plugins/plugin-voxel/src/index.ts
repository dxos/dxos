//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export * from './meta';
export * from './models';
export * from './types';

export const VoxelPlugin = Plugin.lazy(meta, () => import('#plugin'));
