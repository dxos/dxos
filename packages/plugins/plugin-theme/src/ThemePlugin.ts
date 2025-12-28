//
// Copyright 2025 DXOS.org
//

import { Capability, Events, Plugin } from '@dxos/app-framework';

import { meta } from './meta';
import { type ThemePluginOptions } from './react-context';

const ReactContext = Capability.lazy('ReactContext', () => import('./react-context'));

export const ThemePlugin = Plugin.define<ThemePluginOptions>(meta).pipe(
  Plugin.addModule((options: ThemePluginOptions) => ({
    id: 'react-context',
    activatesOn: Events.Startup,
    activatesBefore: [Events.SetupTranslations],
    activate: () => ReactContext(options),
  })),
  Plugin.make,
);
