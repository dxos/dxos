//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';

import { type ThemePluginOptions } from './react-context';
import * as ThemeCapabilities from './types/ThemeCapabilities';

const ReactContext = Capability.lazyModule(
  'ReactContext',
  {
    // A context wraps the tree on its FIRST render by definition, so it cannot be deferred: arriving
    // in the idle wave leaves the roots already mounted outside `ThemeProvider`/`Tooltip.Provider`,
    // which Radix reports as `Tooltip.Trigger must be used within Tooltip`. `AppCapability.reactContext`
    // bakes this gate in; this module predates it and builds its spec directly.
    activatesOn: ActivationEvents.Startup,
    requires: [Capabilities.AtomRegistry, ThemeCapabilities.Settings],
    provides: [Capabilities.ReactContext],
  },
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
  Plugin.addModule(Settings),
  Plugin.addModule(ReactContext),
  Plugin.addModule(Translator),
  Plugin.make,
);

export default ThemePlugin;
