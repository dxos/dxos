//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from './meta';

export const SheetPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { SheetOperationHandlerSet } from '#operations';
