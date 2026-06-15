//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const NavTreePlugin = Plugin.lazy(meta, () => import('#plugin'));

export { NavTreeOperationHandlerSet } from './operations';
