//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { FunctionType, FunctionTrigger } from '@dxos/functions';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const AutomationPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => contributes(ClientCapabilities.Schema, [FunctionType, FunctionTrigger]),
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      activate: ReactSurface,
    }),
  ]);
