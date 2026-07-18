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
  Plugin.addLazyModule(ReactContext),
  Plugin.addLazyModule(Translator),
  Plugin.make,
);

export default ThemePlugin;
