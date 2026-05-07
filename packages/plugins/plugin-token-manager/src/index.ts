//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export * from './meta';
export const TokenManagerPlugin = Plugin.lazy(meta, () => import('#plugin'));
