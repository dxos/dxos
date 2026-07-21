//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';

import { meta } from '#meta';

import { type ThemePluginOptions } from './react-context';
import { ThemeCapabilities } from './types';

const ReactContext = Capability.lazyModule(
  'ReactContext',
  { requires: [Capabilities.AtomRegistry, ThemeCapabilities.Settings], provides: [Capabilities.ReactContext] },
  () => import('./react-context'),
);
const Translator = Capability.lazyModule(
  'Translator',
  { requires: [Capabilities.AtomRegistry, AppCapabilities.Translations], provides: [AppCapabilities.Translator] },
  () => import('./translator'),
);
const Settings = AppCapability.settings(() => import('./settings'), {
  provides: [ThemeCapabilities.Settings],
});

export const ThemePlugin = Plugin.define<ThemePluginOptions>(meta).pipe(
  Plugin.addLazyModule(Settings),
  Plugin.addLazyModule(ReactContext),
  Plugin.addLazyModule(Translator),
  Plugin.make,
);

export default ThemePlugin;
