//
// Copyright 2025 DXOS.org
//

import { setAutoFreeze } from 'immer';

import { allOf, Capabilities, contributes, defineModule, definePlugin, Events, oneOf } from '@dxos/app-framework';
import { AttentionEvents } from '@dxos/plugin-attention';
import { translations as stackTranslations } from '@dxos/react-ui-stack';

import {
  AppGraphBuilder,
  CheckAppScheme,
  DeckState,
  LayoutIntentResolver,
  LayoutState,
  LocationState,
  NavigationIntentResolver,
  ReactContext,
  ReactRoot,
  DeckSettings,
  ReactSurface,
  UrlHandler,
} from './capabilities';
import { DeckEvents } from './events';
import { meta } from './meta';
import translations from './translations';

// NOTE(Zan): When producing values with immer, we shouldn't auto-freeze them because
//   our signal implementation needs to add some hidden properties to the produced values.
// TODO(Zan): Move this to a more global location if we use immer more broadly.
setAutoFreeze(false);

export const DeckPlugin = () =>
  definePlugin(meta, [
    //
    // Settings
    //

    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: DeckSettings,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),

    //
    // Layout
    //

    defineModule({
      id: `${meta.id}/module/layout`,
      activatesOn: oneOf(Events.Startup, Events.SetupAppGraph),
      triggers: [Events.LayoutReady],
      activate: LayoutState,
    }),
    defineModule({
      id: `${meta.id}/module/deck`,
      activatesOn: oneOf(Events.Startup, Events.SetupAppGraph),
      triggers: [DeckEvents.StateReady],
      activate: DeckState,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, [...translations, ...stackTranslations]),
    }),
    defineModule({
      id: `${meta.id}/module/react-context`,
      activatesOn: Events.Startup,
      activate: ReactContext,
    }),
    defineModule({
      id: `${meta.id}/module/react-root`,
      activatesOn: Events.Startup,
      activate: ReactRoot,
    }),
    defineModule({
      id: `${meta.id}/module/layout-intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: LayoutIntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),

    //
    // Navigation
    //

    defineModule({
      id: `${meta.id}/module/location`,
      activatesOn: oneOf(Events.Startup, Events.SetupAppGraph),
      triggers: [Events.LocationReady],
      activate: LocationState,
    }),
    defineModule({
      id: `${meta.id}/module/check-app-scheme`,
      activatesOn: Events.SettingsReady,
      activate: CheckAppScheme,
    }),
    defineModule({
      id: `${meta.id}/module/url`,
      activatesOn: allOf(
        Events.DispatcherReady,
        Events.LayoutReady,
        Events.LocationReady,
        AttentionEvents.AttentionReady,
      ),
      activate: UrlHandler,
    }),
    defineModule({
      id: `${meta.id}/module/navigation-intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: NavigationIntentResolver,
    }),
  ]);
