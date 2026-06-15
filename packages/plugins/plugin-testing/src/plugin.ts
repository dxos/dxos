//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const StorybookPlugin = Plugin.lazy(meta, () => import('#plugin'));
export type { StorybookPluginOptions } from '#plugin';

export { TestingOperationHandlerSet } from './operations';
