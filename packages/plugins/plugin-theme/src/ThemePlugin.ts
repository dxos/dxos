//
// Copyright 2025 DXOS.org
//

import { defineModule, definePlugin, eventKey, Events, lazy } from '@dxos/app-framework/next';

import meta from './meta';
import { type ThemePluginOptions } from './react-context';

export const ThemePlugin = (options: ThemePluginOptions) =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/react-context`,
      activationEvents: [eventKey(Events.Startup)],
      activate: () => lazy(() => import('./react-context'))(options),
    }),
  ]);
