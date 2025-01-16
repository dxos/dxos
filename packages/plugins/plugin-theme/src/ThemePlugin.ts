//
// Copyright 2025 DXOS.org
//

import { defineModule, definePlugin, Events, lazy } from '@dxos/app-framework';

import { meta } from './meta';
import { type ThemePluginOptions } from './react-context';

export const ThemePlugin = (options: ThemePluginOptions) =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/react-context`,
      activatesOn: Events.Startup,
      activatesBefore: [Events.SetupTranslations],
      activate: () => lazy(() => import('./react-context'))(options),
    }),
  ]);
