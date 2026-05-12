//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const ScriptPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { ScriptOperationHandlerSet } from './operations';
