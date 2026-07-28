//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const ExcalidrawPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { ExcalidrawOperationHandlerSet } from './operations';
