//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const DiscordPlugin = Plugin.lazy(meta, () => import('./DiscordPlugin'));

export * from './blueprints';
export * from './types';
