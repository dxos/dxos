//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const ClientPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { ClientOperationHandlerSet } from './operations';
