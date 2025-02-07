//
// Copyright 2025 DXOS.org
//

import { setAutoFreeze } from 'immer';

import { allOf, Capabilities, contributes, defineModule, definePlugin, Events, oneOf } from '@dxos/app-framework';
import { translations as stackTranslations } from '@dxos/react-ui-stack';

import {
  AppGraphBuilder,
  CheckAppScheme,
  DeckSettings,
  DeckState,
  LayoutIntentResolver,
  ReactContext,
  ReactRoot,
  ReactSurface,
  Tools,
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
      activatesOn: oneOf(Events.Startup, Events.SetupAppGraph),
      activatesAfter: [Events.LayoutReady, DeckEvents.StateReady],
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
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
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
    defineModule({
      id: `${meta.id}/module/tools`,
      activatesOn: Events.Startup,
      activate: Tools,
    }),
    defineModule({
      id: `${meta.id}/module/url`,
      activatesOn: allOf(Events.DispatcherReady, DeckEvents.StateReady),
      activate: UrlHandler,
    }),
  ]);
