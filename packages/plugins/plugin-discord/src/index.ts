//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const DiscordPlugin = Plugin.lazy(meta, () => import('./DiscordPlugin'));

export * from './meta';

export * from './blueprints';
