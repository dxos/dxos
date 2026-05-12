//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const SheetPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { SheetOperationHandlerSet } from './operations';
