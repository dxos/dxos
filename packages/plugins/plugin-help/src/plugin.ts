//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const HelpPlugin = Plugin.lazy(meta, () => import('#plugin'));
export type { HelpPluginOptions } from '#plugin';

export { HelpOperationHandlerSet } from './operations';
