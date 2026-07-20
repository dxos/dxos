//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '#meta';

import { type ThemePluginOptions } from './react-context';

const ReactContext = Capability.lazy('ReactContext', () => import('./react-context'));
const Translator = Capability.lazy('Translator', () => import('./translator'));
const Settings = Capability.lazy('Settings', () => import('./settings'));

export const ThemePlugin = Plugin.define<ThemePluginOptions>(meta).pipe(
  Plugin.addModule((options: ThemePluginOptions) => ({
    id: Capability.getModuleTag(ReactContext),
    activatesOn: ActivationEvents.Startup,
    firesBeforeActivation: [AppActivationEvents.SetupTranslations, AppActivationEvents.SetupSettings],
    activate: () => ReactContext(options),
  })),
  Plugin.addModule((options: ThemePluginOptions) => ({
    id: Capability.getModuleTag(Translator),
    activatesOn: ActivationEvents.Startup,
    firesBeforeActivation: [AppActivationEvents.SetupTranslations],
    activate: () => Translator(options),
  })),
  Plugin.addModule({
    id: Capability.getModuleTag(Settings),
    activatesOn: AppActivationEvents.SetupSettings,
    activate: Settings,
  }),
  Plugin.make,
);

export default ThemePlugin;
