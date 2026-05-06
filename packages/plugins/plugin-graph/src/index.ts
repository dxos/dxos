//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const GraphPlugin = Plugin.lazy(meta, () => import('./GraphPlugin'));

export * from './meta';

export * from '@dxos/app-graph';

export * from './action';
export * from './hooks';
