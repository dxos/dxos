//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const TablePlugin = Plugin.lazy(meta, () => import('#plugin'));

export { TableOperationHandlerSet } from './operations';
