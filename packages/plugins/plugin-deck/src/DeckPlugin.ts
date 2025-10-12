//
// Copyright 2025 DXOS.org
//

import { setAutoFreeze } from 'immer';

import { Capabilities, Events, allOf, contributes, defineModule, definePlugin, oneOf } from '@dxos/app-framework';
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

export const DeckPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/check-app-scheme`,
    activatesOn: Events.SettingsReady,
    activate: CheckAppScheme,
  }),
  defineModule({
    id: `${meta.id}/module/settings`,
    activatesOn: Events.SetupSettings,
    activate: DeckSettings,
  }),
  defineModule({
    id: `${meta.id}/module/layout`,
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: oneOf(Events.SetupSettings, Events.SetupAppGraph),
    activatesAfter: [Events.LayoutReady, DeckEvents.StateReady],
    activate: DeckState,
  }),
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, [...translations, ...stackTranslations]),
  }),
  defineModule({
    id: `${meta.id}/module/react-root`,
    activatesOn: Events.Startup,
    activate: ReactRoot,
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/layout-intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: LayoutIntentResolver,
  }),
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  // defineModule({
  //   id: `${meta.id}/module/tools`,
  //   activatesOn: Events.SetupArtifactDefinition,
  //   activate: Tools,
  // }),
  defineModule({
    id: `${meta.id}/module/toolkit`,
    // TODO(wittjosiah): Shouldn't use the startup event.
    activatesOn: Events.Startup,
    activate: Toolkit,
  }),
  defineModule({
    id: `${meta.id}/module/url`,
    activatesOn: allOf(Events.DispatcherReady, DeckEvents.StateReady),
    activate: UrlHandler,
  }),
]);
