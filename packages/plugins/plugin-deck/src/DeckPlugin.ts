//
// Copyright 2025 DXOS.org
//

import { setAutoFreeze } from 'immer';

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { translations as stackTranslations } from '@dxos/react-ui-stack';

import {
  AppGraphBuilder,
  CheckAppScheme,
  DeckSettings,
  DeckState,
  LayoutOperationResolver,
  ReactRoot,
  ReactSurface,
  Toolkit,
  UrlHandler,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { DeckEvents } from './types';

// NOTE(Zan): When producing values with immer, we shouldn't auto-freeze them because
//   our signal implementation needs to add some hidden properties to the produced values.
// TODO(Zan): Move this to a more global location if we use immer more broadly.
setAutoFreeze(false);

export const DeckPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationResolverModule({ activate: LayoutOperationResolver }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...stackTranslations] }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activatesAfter: [DeckEvents.SettingsReady],
    activate: DeckSettings,
  }),
  Plugin.addModule({
    activatesOn: DeckEvents.SettingsReady,
    activate: CheckAppScheme,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: ActivationEvent.oneOf(AppActivationEvents.SetupSettings, AppActivationEvents.SetupAppGraph),
    activatesAfter: [AppActivationEvents.LayoutReady, DeckEvents.StateReady],
    activate: DeckState,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activate: ReactRoot,
  }),
  // Plugin.addModule({
  //   activatesOn: Events.SetupArtifactDefinition,
  //   activate: Tools,
  // }),
  Plugin.addModule({
    // TODO(wittjosiah): Shouldn't use the startup event.
    activatesOn: ActivationEvents.Startup,
    activate: Toolkit,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ActivationEvents.OperationInvokerReady, DeckEvents.StateReady),
    activate: UrlHandler,
  }),
  Plugin.make,
);
