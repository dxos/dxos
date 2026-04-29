//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const GraphPlugin = Plugin.lazy(meta, () => import('./GraphPlugin'));

export * from '@dxos/app-graph';

export * from './action';
export * from './hooks';
