//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const TransformerPlugin = Plugin.lazy(meta, () => import('./TransformerPlugin'));

export * from './meta';
