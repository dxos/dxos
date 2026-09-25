//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { SpotlightCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'));
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root.tsx'));
export const SpotlightDismiss = Capability.lazyModule(
  'SpotlightDismiss',
  { provides: [] },
  () => import('./spotlight-dismiss.ts'),
);
export const State = Capability.lazyModule(
  'State',
  {
    // App-shell state — same reason as the deck's `DeckState`: `SpotlightLayout` reads it on its
    // first render, so the shell cannot paint until this module has run.
    activatesOn: ActivationEvents.Startup,
    provides: [SpotlightCapabilities.State, AppCapabilities.Layout],
  },
  () => import('./state.tsx'),
);
export const Translations = AppCapability.translations(translations);
