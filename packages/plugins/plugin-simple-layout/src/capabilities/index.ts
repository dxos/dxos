//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';
import { SimpleLayoutCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const SpotlightDismiss = Capability.lazyModule(
  'SpotlightDismiss',
  {
    provides: [],
    props: (options: { isPopover?: boolean }) => ({ isPopover: options.isPopover ?? false }),
  },
  () => import('./spotlight-dismiss'),
);
export const State = Capability.lazyModule(
  'State',
  {
    // App-shell state — same reason as the deck's `DeckState`: `SimpleLayout` reads it on its
    // first render, so the shell cannot paint until this module has run.
    activatesOn: ActivationEvents.Startup,
    provides: [SimpleLayoutCapabilities.State, AppCapabilities.Layout],
    props: (options: { isPopover?: boolean }) => ({ initialState: { isPopover: options.isPopover ?? false } }),
  },
  () => import('./state'),
);
export const Translations = AppCapability.translations(translations);
export const UrlHandler = Capability.lazyModule(
  'UrlHandler',
  {
    requires: [
      Capabilities.OperationInvoker,
      AppCapabilities.NavigationHandler,
      Capabilities.AtomRegistry,
      SimpleLayoutCapabilities.State,
      AppCapabilities.AppGraph,
    ],
    provides: [],
  },
  () => import('./url-handler'),
);
