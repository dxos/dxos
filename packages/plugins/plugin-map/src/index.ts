//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const MapPlugin = Plugin.lazy(meta, () => import('./MapPlugin'));

export * from './meta';

export * from './components';
