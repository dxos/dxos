//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const StatusBarPlugin = Plugin.lazy(meta, () => import('./StatusBarPlugin'));

export * from './meta';

export * from './components';
