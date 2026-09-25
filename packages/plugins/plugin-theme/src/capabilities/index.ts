//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { ThemeCapabilities } from '#types';

export const ReactContext = AppCapability.reactContext(() => import('../react-context.tsx'), {
  requires: [Capabilities.AtomRegistry, ThemeCapabilities.Settings],
});
export const Settings = AppCapability.settings(() => import('../settings.ts'), {
  provides: [ThemeCapabilities.Settings],
});
export const Translator = Capability.lazyModule(
  'Translator',
  { requires: [Capabilities.AtomRegistry, AppCapabilities.Translations], provides: [AppCapabilities.Translator] },
  () => import('../translator.ts'),
);
