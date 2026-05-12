//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export * from './meta';
export * from './types';

export const AttentionPlugin = Plugin.lazy(meta, () => import('./AttentionPlugin'));
