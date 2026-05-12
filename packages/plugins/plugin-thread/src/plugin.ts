//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const ThreadPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { ThreadOperationHandlerSet } from './operations';
