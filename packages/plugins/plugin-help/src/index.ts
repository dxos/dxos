//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { HelpCapabilities } from './types';
export * from './constants';
export * from './meta';
export * from './types';

export const HelpPlugin = Plugin.lazy(meta, () => import('#plugin'));
export type { HelpPluginOptions } from '#plugin';
