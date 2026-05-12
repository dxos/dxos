//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const AttentionPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { AttentionOperationHandlerSet } from './operations';
