//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { meta } from '#meta';

import { type ThemePluginOptions } from './react-context';

const ReactContext = Capability.lazyModule(
  'ReactContext',
  { requires: [Capabilities.AtomRegistry], provides: [Capabilities.ReactContext] },
  () => import('./react-context'),
);
const Translator = Capability.lazyModule(
  'Translator',
  { requires: [Capabilities.AtomRegistry, AppCapabilities.Translations], provides: [AppCapabilities.Translator] },
  () => import('./translator'),
);

export const ThemePlugin = Plugin.define<ThemePluginOptions>(meta).pipe(
  Plugin.addModule((options: ThemePluginOptions) => ({
    id: Capability.getModuleTag(ReactContext),
    requires: ReactContext.requires,
    provides: ReactContext.provides,
    activate: () => ReactContext(options),
  })),
  Plugin.addModule((options: ThemePluginOptions) => ({
    id: Capability.getModuleTag(Translator),
    requires: Translator.requires,
    provides: Translator.provides,
    activate: () => Translator(options),
  })),
  Plugin.make,
);

export default ThemePlugin;
