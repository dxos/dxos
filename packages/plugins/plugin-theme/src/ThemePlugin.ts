//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from './meta';
import { type ThemePluginOptions } from './react-context';

const ReactContext = Capability.lazy('ReactContext', () => import('./react-context'));

export const ThemePlugin = Plugin.define<ThemePluginOptions>(meta).pipe(
  Plugin.addModule((options: ThemePluginOptions) => ({
    id: Capability.getModuleTag(ReactContext),
    activatesOn: ActivationEvents.Startup,
    activatesBefore: [AppActivationEvents.SetupTranslations],
    activate: () => ReactContext(options),
  })),
  Plugin.make,
);
