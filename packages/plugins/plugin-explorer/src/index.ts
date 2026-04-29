//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const ExplorerPlugin = Plugin.lazy(meta, () => import('./ExplorerPlugin'));

export * from './components';
export * from './hooks';
