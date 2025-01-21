//
// Copyright 2023 DXOS.org
//

import { definePlugin, defineModule, Events, contributes, Capabilities } from '@dxos/app-framework';

import {
  AppGraphBuilder,
  IntentResolver,
  PresenterSettings,
  PresenterState,
  ReactContext,
  ReactSurface,
} from './capabilities';
import { meta } from './meta';
import translations from './translations';

// TODO(burdon): Only scale markdown content.
// TODO(burdon): Map stack content; Slide content type (e.g., markdown, sketch, IPFS image, table, etc.)

export const PresenterPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: PresenterSettings,
    }),
    defineModule({
      id: `${meta.id}/module/state`,
      activatesOn: Events.Startup,
      activate: PresenterState,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/react-context`,
      activatesOn: Events.Startup,
      activate: ReactContext,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
  ]);
