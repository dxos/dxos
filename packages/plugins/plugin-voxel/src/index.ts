//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const VoxelPlugin = Plugin.lazy(meta, () => import('./VoxelPlugin'));

export * from './meta';

export * from './components';
export * from './models';
