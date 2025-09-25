//
// Copyright 2025 DXOS.org
//

import { Events, defineModule, definePlugin, lazy } from '@dxos/app-framework';

import { meta } from './meta';
import { type ThemePluginOptions } from './react-context';

export const ThemePlugin = definePlugin<ThemePluginOptions>(meta, (options) => [
  defineModule({
    id: `${meta.id}/module/react-context`,
    activatesOn: Events.Startup,
    activatesBefore: [Events.SetupTranslations],
    activate: () => lazy(() => import('./react-context'))(options),
  }),
]);
