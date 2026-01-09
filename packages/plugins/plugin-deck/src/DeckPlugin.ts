//
// Copyright 2025 DXOS.org
//

import { setAutoFreeze } from 'immer';

import { ActivationEvent, Common, Plugin } from '@dxos/app-framework';
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
    activatesOn: Common.ActivationEvent.SettingsReady,
    activate: CheckAppScheme,
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: DeckSettings,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: ActivationEvent.oneOf(Common.ActivationEvent.SetupSettings, Common.ActivationEvent.SetupAppGraph),
    activatesAfter: [Common.ActivationEvent.LayoutReady, DeckEvents.StateReady],
    activate: DeckState,
  }),
  Common.Plugin.addTranslationsModule({ translations: [...translations, ...stackTranslations] }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activate: ReactRoot,
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: LayoutIntentResolver }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  // Plugin.addModule({
  //   activatesOn: Events.SetupArtifactDefinition,
  //   activate: Tools,
  // }),
  Plugin.addModule({
    // TODO(wittjosiah): Shouldn't use the startup event.
    activatesOn: Common.ActivationEvent.Startup,
    activate: Toolkit,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(Common.ActivationEvent.DispatcherReady, DeckEvents.StateReady),
    activate: UrlHandler,
  }),
  Plugin.make,
);
