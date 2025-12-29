//
// Copyright 2025 DXOS.org
//

import { Capability, Common, Plugin } from '@dxos/app-framework';

import { meta } from './meta';
import { type ThemePluginOptions } from './react-context';

const ReactContext = Capability.lazy('ReactContext', () => import('./react-context'));

export const ThemePlugin = Plugin.define<ThemePluginOptions>(meta).pipe(
  Plugin.addModule((options: ThemePluginOptions) => ({
    id: Capability.getModuleTag(ReactContext),
    activatesOn: Common.ActivationEvent.Startup,
    activatesBefore: [Common.ActivationEvent.SetupTranslations],
    activate: () => ReactContext(options),
  })),
  Plugin.make,
);
