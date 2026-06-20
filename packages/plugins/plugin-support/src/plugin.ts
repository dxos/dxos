//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const SupportPlugin = Plugin.lazy(meta, () => import('#plugin'));
export type { SupportPluginOptions } from '#plugin';

export { SupportOperationHandlerSet } from './operations';
