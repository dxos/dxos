//
// Copyright 2025 DXOS.org
//

import { setAutoFreeze } from 'immer';

import { Capabilities, Events, ActivationEvent, Capability, Plugin } from '@dxos/app-framework';
import { translations as stackTranslations } from '@dxos/react-ui-stack';

import {
  AppGraphBuilder,
  CheckAppScheme,
  DeckSettings,
  DeckState,
  LayoutIntentResolver,
  ReactRoot,
  ReactSurface,
  Toolkit,
  UrlHandler,
} from './capabilities';
import { DeckEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';

// NOTE(Zan): When producing values with immer, we shouldn't auto-freeze them because
//   our signal implementation needs to add some hidden properties to the produced values.
// TODO(Zan): Move this to a more global location if we use immer more broadly.
setAutoFreeze(false);

export const DeckPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: Events.SettingsReady,
    activate: CheckAppScheme,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupSettings,
    activate: DeckSettings,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: ActivationEvent.oneOf(Events.SetupSettings, Events.SetupAppGraph),
    activatesAfter: [Events.LayoutReady, DeckEvents.StateReady],
    activate: DeckState,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, [...translations, ...stackTranslations]),
  }),
  Plugin.addModule({
    activatesOn: Events.Startup,
    activate: ReactRoot,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupIntentResolver,
    activate: LayoutIntentResolver,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  // Plugin.addModule({
  //   activatesOn: Events.SetupArtifactDefinition,
  //   activate: Tools,
  // }),
  Plugin.addModule({
    // TODO(wittjosiah): Shouldn't use the startup event.
    activatesOn: Events.Startup,
    activate: Toolkit,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(Events.DispatcherReady, DeckEvents.StateReady),
    activate: UrlHandler,
  }),
  Plugin.make,
);
