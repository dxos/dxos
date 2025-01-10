//
// Copyright 2025 DXOS.org
//

import { setAutoFreeze } from 'immer';

import { Capabilities, contributes, defineModule, definePlugin, eventKey, Events } from '@dxos/app-framework/next';
import { AttentionEvents } from '@dxos/plugin-attention';
import { translations as stackTranslations } from '@dxos/react-ui-stack';

import {
  DeckState,
  GraphBuilder,
  LayoutIntents,
  LayoutState,
  ReactContext,
  ReactRoot,
  CheckAppScheme,
  LocationState,
  NavigationIntents,
  Url,
  Settings,
  Surface,
} from './capabilities';
import { DeckEvents } from './events';
import meta from './meta';
import translations from './translations';

// NOTE(Zan): When producing values with immer, we shouldn't auto-freeze them because
//   our signal implementation needs to add some hidden properties to the produced values.
// TODO(Zan): Move this to a more global location if we use immer more broadly.
setAutoFreeze(false);

export const DeckPlugin = definePlugin(meta, [
  //
  // Settings
  //

  defineModule({
    id: `${meta.id}/module/settings`,
    activationEvents: [eventKey(Events.SetupSettings)],
    activate: Settings,
  }),

  //
  // Layout
  //

  defineModule({
    id: `${meta.id}/module/layout`,
    activationEvents: [eventKey(Events.Startup)],
    triggeredEvents: [eventKey(Events.LayoutReady)],
    activate: LayoutState,
  }),
  defineModule({
    id: `${meta.id}/module/deck`,
    activationEvents: [eventKey(Events.Startup)],
    triggeredEvents: [eventKey(DeckEvents.StateReady)],
    activate: DeckState,
  }),
  defineModule({
    id: `${meta.id}/module/translations`,
    activationEvents: [eventKey(Events.SetupTranslations)],
    activate: () => contributes(Capabilities.Translations, [...translations, ...stackTranslations]),
  }),
  defineModule({
    id: `${meta.id}/module/react-context`,
    activationEvents: [eventKey(Events.Startup)],
    activate: ReactContext,
  }),
  defineModule({
    id: `${meta.id}/module/root`,
    activationEvents: [eventKey(Events.Startup)],
    activate: ReactRoot,
  }),
  defineModule({
    id: `${meta.id}/module/surface`,
    activationEvents: [eventKey(Events.Startup)],
    activate: Surface,
  }),
  defineModule({
    id: `${meta.id}/module/layout-intents`,
    activationEvents: [eventKey(Events.SetupIntents)],
    activate: LayoutIntents,
  }),
  defineModule({
    id: `${meta.id}/module/graph-builder`,
    activationEvents: [eventKey(Events.SetupAppGraph)],
    activate: GraphBuilder,
  }),

  //
  // Navigation
  //

  defineModule({
    id: `${meta.id}/module/location`,
    activationEvents: [eventKey(Events.Startup)],
    triggeredEvents: [eventKey(Events.LocationReady)],
    activate: LocationState,
  }),
  defineModule({
    id: `${meta.id}/module/check-app-scheme`,
    activationEvents: [eventKey(Events.SettingsReady)],
    activate: CheckAppScheme,
  }),
  defineModule({
    id: `${meta.id}/module/url`,
    activationEvents: [
      eventKey(Events.DispatcherReady),
      eventKey(Events.LayoutReady),
      eventKey(Events.LocationReady),
      eventKey(AttentionEvents.AttentionReady),
    ],
    activate: Url,
  }),
  defineModule({
    id: `${meta.id}/module/navigation-intents`,
    activationEvents: [eventKey(Events.SetupIntents)],
    activate: NavigationIntents,
  }),
]);
